import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './supabase'
import { toTSV, sanitize, todayISO, shiftAudit, NEVER_AUDITED, type AuditData } from './tsv'

export async function handleEntity(
  table: string,
  metaKey: string,
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const [{ data: meta }, { data: rows }] = await Promise.all([
      supabase.from('crm_meta').select('value').eq('key', metaKey).single(),
      supabase.from(table).select('id, row_data').order('created_at' as never),
    ])

    const headers: string[] = (meta?.value as string[]) ?? []
    if (!rows || rows.length === 0) {
      res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8')
      return res.end(headers.join('\t') + '\n')
    }

    const objects = rows.map((r) => ({ ...(r.row_data as Record<string, string>), id: r.id }))
    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8')
    return res.end(toTSV(headers, objects))
  }

  if (req.method === 'POST') {
    const body = req.body as { id?: string; patch?: Record<string, string>; by?: string }
    if (!body.id || !body.patch || typeof body.patch !== 'object') {
      return res.status(400).json({ error: 'Body must be { id, patch }' })
    }

    const { data: existing } = await supabase
      .from(table)
      .select('row_data')
      .eq('id', body.id)
      .single()

    if (!existing) return res.status(404).json({ error: `Row ${body.id} not found` })

    const rowData: Record<string, string> = { ...(existing.row_data as Record<string, string>) }
    const at = todayISO()
    const by = body.by?.trim() || 'me'
    const changedFields: string[] = []

    // Load audit
    const { data: auditMeta } = await supabase
      .from('crm_meta')
      .select('value')
      .eq('key', 'audit')
      .single()
    const audit: AuditData = (auditMeta?.value as AuditData) ?? {
      companies: {},
      contacts: {},
      calls: {},
    }

    for (const [k, v] of Object.entries(body.patch)) {
      if (k === 'id') continue
      const newVal = sanitize(v)
      if (newVal === (rowData[k] ?? '')) continue
      rowData[k] = newVal
      if (!NEVER_AUDITED.has(k)) {
        shiftAudit(audit, table.replace('crm_', ''), body.id, k, by, at)
        changedFields.push(k)
      }
    }

    if (changedFields.length > 0) {
      rowData['updated_by'] = by
      rowData['updated_at'] = at
      await Promise.all([
        supabase.from(table).update({ row_data: rowData, updated_at: at }).eq('id', body.id),
        supabase.from('crm_meta').upsert({ key: 'audit', value: audit }),
      ])
    }

    return res.json({ ok: true, id: body.id, changed: changedFields })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
