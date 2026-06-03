import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })

  const body = req.body as {
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
  if (!anthropicRes.ok) return res.status(502).json({ error: `Anthropic error: ${anthropicRes.status} ${responseText}` })

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.end(responseText)
}
