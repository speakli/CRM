import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase'
import { sanitize, todayISO } from '../_lib/tsv'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body as {
    contact_id?: string
    date?: string
    type?: string
    summary?: string
    next_action?: string
  }

  const id = crypto.randomUUID()
  const now = todayISO()

  const { data: meta } = await supabase
    .from('crm_meta')
    .select('value')
    .eq('key', 'calls_headers')
    .single()

  const headers: string[] = (meta?.value as string[]) ?? [
    'id', 'contact_id', 'date', 'type', 'summary', 'next_action',
    'created_by', 'created_at', 'updated_by', 'updated_at',
  ]

  const rowData: Record<string, string> = {}
  for (const h of headers) {
    if (h === 'id') continue
    if (h === 'contact_id') rowData[h] = sanitize(body.contact_id ?? '')
    else if (h === 'date') rowData[h] = sanitize(body.date ?? now)
    else if (h === 'type') rowData[h] = sanitize(body.type ?? 'Appel')
    else if (h === 'summary') rowData[h] = sanitize(body.summary ?? '')
    else if (h === 'next_action') rowData[h] = sanitize(body.next_action ?? '')
    else if (h === 'created_by' || h === 'updated_by') rowData[h] = 'assistant'
    else if (h === 'created_at' || h === 'updated_at') rowData[h] = now
    else rowData[h] = ''
  }

  const { error } = await supabase.from('crm_calls').insert({ id, row_data: rowData, created_at: now, updated_at: now })
  if (error) return res.status(500).json({ error: error.message })

  return res.json({ ok: true, id })
}
