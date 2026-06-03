import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.CRM_DATA_DIR || resolve(__dirname, '..', 'data')

const FILES: Record<string, string> = {
  contacts: 'contacts.tsv',
  companies: 'companies.tsv',
  calls: 'calls.tsv',
}

const VIEWS_FILE = 'crm-views.json'
const AUDIT_FILE = 'crm-audit.json'
const LISTS_FILE = 'crm-lists.json'

const NEVER_AUDITED = new Set([
  'id',
  'created_by',
  'created_at',
  'updated_by',
  'updated_at',
])

function sanitize(value: string): string {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\t+/g, ' ')
    .trim()
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function readTSV(filePath: string): { headers: string[]; rows: string[][] } {
  const text = readFileSync(filePath, 'utf-8')
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split('\t')
  const rows = lines.slice(1).map((l) => {
    const cells = l.split('\t')
    while (cells.length < headers.length) cells.push('')
    return cells
  })
  return { headers, rows }
}

function writeTSV(filePath: string, headers: string[], rows: string[][]) {
  const body = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n') + '\n'
  const tmp = filePath + '.tmp'
  writeFileSync(tmp, body, 'utf-8')
  renameSync(tmp, filePath)
}

type AuditEntry = { by: string; at: string }
type FieldAudit = { current?: AuditEntry; previous?: AuditEntry }
type AuditFile = {
  companies: Record<string, Record<string, FieldAudit>>
  contacts: Record<string, Record<string, FieldAudit>>
  calls: Record<string, Record<string, FieldAudit>>
}

function readAudit(auditPath: string): AuditFile {
  if (!existsSync(auditPath)) return { companies: {}, contacts: {}, calls: {} }
  try {
    const raw = readFileSync(auditPath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AuditFile>
    return {
      companies: parsed.companies ?? {},
      contacts: parsed.contacts ?? {},
      calls: parsed.calls ?? {},
    }
  } catch {
    return { companies: {}, contacts: {}, calls: {} }
  }
}

function writeAudit(auditPath: string, data: AuditFile) {
  const tmp = auditPath + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  renameSync(tmp, auditPath)
}

function shiftAudit(
  audit: AuditFile,
  table: 'companies' | 'contacts' | 'calls',
  rowId: string,
  field: string,
  by: string,
  at: string,
) {
  if (!audit[table][rowId]) audit[table][rowId] = {}
  const fieldAudit: FieldAudit = audit[table][rowId][field] ?? {}
  if (fieldAudit.current) fieldAudit.previous = fieldAudit.current
  fieldAudit.current = { by, at }
  audit[table][rowId][field] = fieldAudit
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', rejectBody)
  })
}

function sendJSON(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'crm-tsv-server',
      configureServer(server) {
        const viewsPath = resolve(DATA_DIR, VIEWS_FILE)
        const auditPath = resolve(DATA_DIR, AUDIT_FILE)
        const listsPath = resolve(DATA_DIR, LISTS_FILE)

        server.middlewares.use('/api/lists', async (req, res) => {
          if (req.method === 'GET') {
            try {
              const content = existsSync(listsPath)
                ? readFileSync(listsPath, 'utf-8')
                : '{"contacts":[],"companies":[]}'
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.setHeader('Cache-Control', 'no-store')
              res.end(content)
            } catch (err) {
              sendJSON(res, 500, { error: `Read lists failed: ${(err as Error).message}` })
            }
            return
          }
          if (req.method === 'POST') {
            try {
              const raw = await readBody(req)
              const parsed = JSON.parse(raw)
              if (!parsed || typeof parsed !== 'object') {
                sendJSON(res, 400, { error: 'Body must be a JSON object' })
                return
              }
              const tmp = listsPath + '.tmp'
              writeFileSync(tmp, JSON.stringify(parsed, null, 2) + '\n', 'utf-8')
              renameSync(tmp, listsPath)
              sendJSON(res, 200, { ok: true })
            } catch (err) {
              sendJSON(res, 500, { error: `Write lists failed: ${(err as Error).message}` })
            }
            return
          }
          sendJSON(res, 405, { error: 'Method not allowed' })
        })

        server.middlewares.use('/api/views', async (req, res) => {
          if (req.method === 'GET') {
            try {
              const content = readFileSync(viewsPath, 'utf-8')
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.setHeader('Cache-Control', 'no-store')
              res.end(content)
            } catch (err) {
              sendJSON(res, 500, { error: `Read views failed: ${(err as Error).message}` })
            }
            return
          }
          if (req.method === 'POST') {
            try {
              const raw = await readBody(req)
              const parsed = JSON.parse(raw)
              if (!parsed || typeof parsed !== 'object') {
                sendJSON(res, 400, { error: 'Body must be a JSON object' })
                return
              }
              const tmp = viewsPath + '.tmp'
              writeFileSync(tmp, JSON.stringify(parsed, null, 2) + '\n', 'utf-8')
              renameSync(tmp, viewsPath)
              sendJSON(res, 200, { ok: true })
            } catch (err) {
              sendJSON(res, 500, { error: `Write views failed: ${(err as Error).message}` })
            }
            return
          }
          sendJSON(res, 405, { error: 'Method not allowed' })
        })

        server.middlewares.use('/api/audit', async (req, res) => {
          if (req.method === 'GET') {
            try {
              const content = existsSync(auditPath)
                ? readFileSync(auditPath, 'utf-8')
                : '{"companies":{},"contacts":{},"calls":{}}'
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.setHeader('Cache-Control', 'no-store')
              res.end(content)
            } catch (err) {
              sendJSON(res, 500, { error: `Read audit failed: ${(err as Error).message}` })
            }
            return
          }
          sendJSON(res, 405, { error: 'Method not allowed' })
        })

        server.middlewares.use('/api/calls/create', async (req, res) => {
          if (req.method !== 'POST') {
            sendJSON(res, 405, { error: 'Method not allowed' })
            return
          }
          try {
            const raw = await readBody(req)
            const body = JSON.parse(raw) as {
              contact_id?: string
              date?: string
              type?: string
              summary?: string
              next_action?: string
            }
            const callsPath = resolve(DATA_DIR, FILES.calls)
            const { headers, rows } = readTSV(callsPath)
            const id = crypto.randomUUID()
            const now = todayISO()
            const newRow = headers.map((h) => {
              if (h === 'id') return id
              if (h === 'contact_id') return sanitize(body.contact_id ?? '')
              if (h === 'date') return sanitize(body.date ?? now)
              if (h === 'type') return sanitize(body.type ?? 'Appel')
              if (h === 'summary') return sanitize(body.summary ?? '')
              if (h === 'next_action') return sanitize(body.next_action ?? '')
              if (h === 'created_by' || h === 'updated_by') return 'assistant'
              if (h === 'created_at' || h === 'updated_at') return now
              return ''
            })
            rows.push(newRow)
            writeTSV(callsPath, headers, rows)
            sendJSON(res, 200, { ok: true, id })
          } catch (err) {
            sendJSON(res, 500, { error: `Create call failed: ${(err as Error).message}` })
          }
        })

        server.middlewares.use('/api/docs', (req, res) => {
          const url = req.url ?? '/'
          // Strip leading slash to get the doc name
          const name = url.replace(/^\//, '').split('?')[0]
          const allowed = ['crm-rules', 'icp']
          if (!allowed.includes(name)) {
            res.statusCode = 404
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end('Not found')
            return
          }
          const docPath = resolve(DATA_DIR, '..', 'docs', name + '.md')
          try {
            const content = readFileSync(docPath, 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            res.end(content)
          } catch {
            res.statusCode = 404
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end('Not found')
          }
        })

        server.middlewares.use('/api/ai/chat', async (req, res) => {
          if (req.method !== 'POST') {
            sendJSON(res, 405, { error: 'Method not allowed' })
            return
          }
          const apiKey = process.env.VITE_ANTHROPIC_API_KEY
          if (!apiKey) {
            sendJSON(res, 500, { error: 'VITE_ANTHROPIC_API_KEY not configured in .env' })
            return
          }
          try {
            const raw = await readBody(req)
            const body = JSON.parse(raw) as {
              system: string
              messages: Array<{ role: string; content: string }>
            }
            const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: body.system,
                messages: body.messages,
              }),
            })
            const responseText = await anthropicRes.text()
            if (!anthropicRes.ok) {
              sendJSON(res, 502, { error: `Anthropic error: ${anthropicRes.status} ${responseText}` })
              return
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(responseText)
          } catch (err) {
            sendJSON(res, 500, { error: `AI chat failed: ${(err as Error).message}` })
          }
        })

        for (const [key, file] of Object.entries(FILES)) {
          const route = `/api/${key}`
          server.middlewares.use(route, async (req, res) => {
            const filePath = resolve(DATA_DIR, file)

            if (req.method === 'GET') {
              try {
                const content = readFileSync(filePath, 'utf-8')
                res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8')
                res.setHeader('Cache-Control', 'no-store')
                res.end(content)
              } catch (err) {
                sendJSON(res, 500, { error: `Read failed: ${(err as Error).message}` })
              }
              return
            }

            if (req.method === 'POST') {
              try {
                const raw = await readBody(req)
                const parsed = JSON.parse(raw) as {
                  id?: string
                  patch?: Record<string, string>
                  by?: string
                }
                if (!parsed.id || !parsed.patch || typeof parsed.patch !== 'object') {
                  sendJSON(res, 400, { error: 'Body must be { id: string, patch: object }' })
                  return
                }
                const by = (parsed.by && parsed.by.trim()) || 'me'
                const at = todayISO()
                const { headers, rows } = readTSV(filePath)
                const idIdx = headers.indexOf('id')
                if (idIdx === -1) {
                  sendJSON(res, 500, { error: 'No "id" column in TSV' })
                  return
                }
                const targetIdx = rows.findIndex((r) => r[idIdx] === parsed.id)
                if (targetIdx === -1) {
                  sendJSON(res, 404, { error: `Row ${parsed.id} not found in ${file}` })
                  return
                }
                const row = rows[targetIdx].slice()
                while (row.length < headers.length) row.push('')

                const audit = readAudit(auditPath)
                const tableKey = key as 'companies' | 'contacts' | 'calls'
                const changedFields: string[] = []

                for (const [k, v] of Object.entries(parsed.patch)) {
                  if (k === 'id') continue
                  const colIdx = headers.indexOf(k)
                  if (colIdx === -1) continue
                  const newVal = sanitize(v)
                  const oldVal = row[colIdx] ?? ''
                  if (newVal === oldVal) continue
                  row[colIdx] = newVal
                  if (!NEVER_AUDITED.has(k)) {
                    shiftAudit(audit, tableKey, parsed.id, k, by, at)
                    changedFields.push(k)
                  }
                }

                if (changedFields.length > 0) {
                  const updByIdx = headers.indexOf('updated_by')
                  const updAtIdx = headers.indexOf('updated_at')
                  if (updByIdx !== -1) row[updByIdx] = by
                  if (updAtIdx !== -1) row[updAtIdx] = at
                }

                rows[targetIdx] = row
                writeTSV(filePath, headers, rows)
                if (changedFields.length > 0) writeAudit(auditPath, audit)
                sendJSON(res, 200, { ok: true, id: parsed.id, changed: changedFields })
              } catch (err) {
                sendJSON(res, 500, { error: `Write failed: ${(err as Error).message}` })
              }
              return
            }

            sendJSON(res, 405, { error: 'Method not allowed' })
          })
        }
      },
    },
  ],
  server: { port: 5174 },
})
