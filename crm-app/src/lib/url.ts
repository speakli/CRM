export function toExternalUrl(raw: string | null | undefined): string {
  if (!raw) return ''
  const v = String(raw).trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (v.startsWith('//')) return `https:${v}`
  if (v.startsWith('mailto:') || v.startsWith('tel:')) return v
  return `https://${v.replace(/^\/+/, '')}`
}
