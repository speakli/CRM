import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const { data } = await supabase.from('crm_meta').select('value').eq('key', 'lists').single()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.end(JSON.stringify(data?.value ?? { contacts: [], companies: [] }))
  }

  if (req.method === 'POST') {
    const body = req.body
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid body' })
    const { error } = await supabase.from('crm_meta').upsert({ key: 'lists', value: body })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
