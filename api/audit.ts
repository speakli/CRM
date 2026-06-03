import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Cache-Control', 'no-store')
  const { data } = await supabase.from('crm_meta').select('value').eq('key', 'audit').single()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.end(JSON.stringify(data?.value ?? { companies: {}, contacts: {}, calls: {} }))
}
