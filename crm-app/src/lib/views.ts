export type SortRule = { id: string; desc: boolean }
/** Filter value : string for single-match, or string[] for multi-OR (cell value in array). */
export type FilterRule = { id: string; value: string | string[] }

export type View = {
  id: string
  name: string
  columns: string[]
  sort: SortRule[]
  filters: FilterRule[]
}

export type ViewsConfig = {
  contacts: View[]
  companies: View[]
}

export type Table = 'contacts' | 'companies'

export async function fetchViews(): Promise<ViewsConfig> {
  const r = await fetch('/api/views', { cache: 'no-store' })
  if (!r.ok) throw new Error(`Views: HTTP ${r.status}`)
  return (await r.json()) as ViewsConfig
}

export async function saveViews(config: ViewsConfig): Promise<void> {
  const r = await fetch('/api/views', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `HTTP ${r.status}`)
  }
}

export function viewsEqual(a: View, b: View): boolean {
  if (a.columns.length !== b.columns.length) return false
  for (let i = 0; i < a.columns.length; i++) if (a.columns[i] !== b.columns[i]) return false
  if (a.sort.length !== b.sort.length) return false
  for (let i = 0; i < a.sort.length; i++) {
    if (a.sort[i].id !== b.sort[i].id || a.sort[i].desc !== b.sort[i].desc) return false
  }
  if (a.filters.length !== b.filters.length) return false
  const af = [...a.filters].sort((x, y) => x.id.localeCompare(y.id))
  const bf = [...b.filters].sort((x, y) => x.id.localeCompare(y.id))
  for (let i = 0; i < af.length; i++) {
    if (af[i].id !== bf[i].id) return false
    const av = af[i].value
    const bv = bf[i].value
    if (Array.isArray(av) || Array.isArray(bv)) {
      const aa = Array.isArray(av) ? [...av].sort() : [av]
      const bb = Array.isArray(bv) ? [...bv].sort() : [bv]
      if (aa.length !== bb.length) return false
      for (let j = 0; j < aa.length; j++) if (aa[j] !== bb[j]) return false
    } else if (av !== bv) return false
  }
  return true
}

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function uniqueViewId(existing: View[], proposed: string): string {
  if (!existing.some((v) => v.id === proposed)) return proposed
  let i = 2
  while (existing.some((v) => v.id === `${proposed}-${i}`)) i++
  return `${proposed}-${i}`
}
