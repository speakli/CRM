import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({
    ok: true,
    supabase_url: process.env.SUPABASE_URL ? 'set' : 'MISSING',
    supabase_key: process.env.SUPABASE_SERVICE_KEY ? 'set' : 'MISSING',
  })
}
