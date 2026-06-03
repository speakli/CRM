import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase'

const ALLOWED = new Set(['crm-rules', 'icp'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const doc = req.query.doc as string
  if (!ALLOWED.has(doc)) return res.status(404).end('Not found')

  const key = `doc_${doc.replace('-', '_')}`
  const { data } = await supabase.from('crm_meta').select('value').eq('key', key).single()

  if (!data?.value) return res.status(404).end('Not found')

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.end(data.value as string)
}
