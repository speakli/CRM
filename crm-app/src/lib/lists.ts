import type { FilterRule, SortRule } from './views'

export type ListTable = 'contacts' | 'companies'

export type CRMList = {
  id: string
  name: string
  ids: string[]
  created_at: string
  updated_at: string
  columns?: string[]
  sort?: SortRule[]
  filters?: FilterRule[]
}

export type ListsConfig = {
  contacts: CRMList[]
  companies: CRMList[]
}

export async function fetchLists(): Promise<ListsConfig> {
  const r = await fetch('/api/lists', { cache: 'no-store' })
  if (!r.ok) throw new Error(`Lists: HTTP ${r.status}`)
  return (await r.json()) as ListsConfig
}

export async function saveLists(config: ListsConfig): Promise<void> {
  const r = await fetch('/api/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `HTTP ${r.status}`)
  }
}

export function slugifyListName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function uniqueListId(existing: CRMList[], proposed: string): string {
  const base = proposed || 'list'
  if (!existing.some((l) => l.id === base)) return base
  let i = 2
  while (existing.some((l) => l.id === `${base}-${i}`)) i++
  return `${base}-${i}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addIdsToList(list: CRMList, idsToAdd: string[]): { list: CRMList; addedCount: number } {
  const existing = new Set(list.ids)
  const added: string[] = []
  for (const id of idsToAdd) {
    if (!existing.has(id)) {
      existing.add(id)
      added.push(id)
    }
  }
  if (added.length === 0) return { list, addedCount: 0 }
  return {
    list: { ...list, ids: [...list.ids, ...added], updated_at: todayISO() },
    addedCount: added.length,
  }
}

export function listLayoutEqual(
  a: { columns: string[]; sort: SortRule[]; filters: FilterRule[] },
  b: { columns: string[]; sort: SortRule[]; filters: FilterRule[] },
): boolean {
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

export function removeIdsFromList(list: CRMList, idsToRemove: string[]): CRMList {
  const remove = new Set(idsToRemove)
  const next = list.ids.filter((id) => !remove.has(id))
  if (next.length === list.ids.length) return list
  return { ...list, ids: next, updated_at: todayISO() }
}
