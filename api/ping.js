module.exports = (req, res) => {
  res.json({
    ok: true,
    supabase_url: process.env.SUPABASE_URL ? 'set' : 'MISSING',
    supabase_key: process.env.SUPABASE_SERVICE_KEY ? 'set' : 'MISSING',
  })
}
