import { useMemo, useState } from 'react'
import type { Call, Company, Contact } from '../parseTSV'
import { Badge } from '../components/Badge'
import { PROPERTIES, type PropertyMeta } from '../lib/properties'

type TableFilter = 'all' | 'companies' | 'contacts' | 'calls'

const tableColors: Record<string, string> = {
  companies: 'bg-violet-100 text-violet-800 ring-violet-200',
  contacts: 'bg-blue-100 text-blue-800 ring-blue-200',
  calls: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
}

const typeColors: Record<string, string> = {
  slug: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  fk: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  string: 'bg-zinc-50 text-zinc-700 ring-zinc-200',
  text: 'bg-zinc-50 text-zinc-700 ring-zinc-200',
  url: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  enum: 'bg-purple-50 text-purple-700 ring-purple-200',
  'multi-csv': 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  int: 'bg-amber-50 text-amber-700 ring-amber-200',
  date: 'bg-sky-50 text-sky-700 ring-sky-200',
}

function fillBarColor(rate: number): string {
  if (rate >= 0.9) return 'bg-emerald-500'
  if (rate >= 0.5) return 'bg-amber-500'
  if (rate > 0) return 'bg-orange-500'
  return 'bg-zinc-300'
}

function FillRateBar({ rate, count, total }: { rate: number; count: number; total: number }) {
  const pct = Math.round(rate * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-5 w-24 overflow-hidden rounded bg-zinc-100">
        <div
          className={`absolute inset-y-0 left-0 ${fillBarColor(rate)}`}
          style={{ width: `${pct}%` }}
        />
        <div className="relative flex h-full items-center justify-center text-[10px] font-medium tabular-nums text-zinc-800">
          {pct}%
        </div>
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-zinc-500">
        {count}/{total}
      </span>
    </div>
  )
}

function computeStats(
  prop: PropertyMeta,
  companies: Company[],
  contacts: Contact[],
  calls: Call[],
): { count: number; total: number; rate: number; distinct: number; topValues: [string, number][] } {
  let rows: Record<string, string>[]
  if (prop.table === 'companies') rows = companies as unknown as Record<string, string>[]
  else if (prop.table === 'contacts') rows = contacts as unknown as Record<string, string>[]
  else rows = calls as unknown as Record<string, string>[]

  const total = rows.length
  let count = 0
  const valueCounts = new Map<string, number>()

  for (const row of rows) {
    const v = String(row[prop.name] ?? '').trim()
    if (v) {
      count++
      if (prop.type === 'multi-csv') {
        for (const tag of v.split(',').map((t) => t.trim()).filter(Boolean)) {
          valueCounts.set(tag, (valueCounts.get(tag) ?? 0) + 1)
        }
      } else {
        valueCounts.set(v, (valueCounts.get(v) ?? 0) + 1)
      }
    }
  }

  const rate = total > 0 ? count / total : 0
  const distinct = valueCounts.size
  const topValues = Array.from(valueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return { count, total, rate, distinct, topValues }
}

export function PropertiesView({
  companies,
  contacts,
  calls,
}: {
  companies: Company[]
  contacts: Contact[]
  calls: Call[]
}) {
  const [tableFilter, setTableFilter] = useState<TableFilter>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'order' | 'fill_asc' | 'fill_desc' | 'name'>('order')
  const [hideRequired, setHideRequired] = useState(false)

  const enriched = useMemo(() => {
    return PROPERTIES.map((p) => ({
      meta: p,
      stats: computeStats(p, companies, contacts, calls),
    }))
  }, [companies, contacts, calls])

  const filtered = useMemo(() => {
    let rows = enriched
    if (tableFilter !== 'all') rows = rows.filter((r) => r.meta.table === tableFilter)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.meta.name.toLowerCase().includes(s) ||
          r.meta.description.toLowerCase().includes(s) ||
          r.meta.source.toLowerCase().includes(s),
      )
    }
    if (hideRequired) rows = rows.filter((r) => !r.meta.required)
    if (sortBy === 'fill_asc') rows = [...rows].sort((a, b) => a.stats.rate - b.stats.rate)
    else if (sortBy === 'fill_desc') rows = [...rows].sort((a, b) => b.stats.rate - a.stats.rate)
    else if (sortBy === 'name')
      rows = [...rows].sort((a, b) => a.meta.name.localeCompare(b.meta.name))
    return rows
  }, [enriched, tableFilter, search, hideRequired, sortBy])

  const kpis = useMemo(() => {
    const total = PROPERTIES.length
    const filled = enriched.filter((e) => e.stats.rate >= 0.9).length
    const empty = enriched.filter((e) => e.stats.rate === 0).length
    const lowFill = enriched.filter((e) => e.stats.rate > 0 && e.stats.rate < 0.5).length
    return { total, filled, empty, lowFill }
  }, [enriched])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total properties" value={kpis.total} />
        <KpiCard
          label="Well filled (≥90%)"
          value={kpis.filled}
          accent="text-emerald-700"
        />
        <KpiCard
          label="Sparsely filled (<50%)"
          value={kpis.lowFill}
          accent="text-orange-700"
        />
        <KpiCard label="Empty" value={kpis.empty} accent="text-zinc-400" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3">
        <input
          type="search"
          placeholder="Search (name, description, source…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-72 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
        />
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value as TableFilter)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="all">All tables</option>
          <option value="companies">companies.tsv</option>
          <option value="contacts">contacts.tsv</option>
          <option value="calls">calls.tsv</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as 'order' | 'fill_asc' | 'fill_desc' | 'name')
          }
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="order">Sort: schema order</option>
          <option value="fill_desc">Sort: fill rate ↓</option>
          <option value="fill_asc">Sort: fill rate ↑ (to enrich)</option>
          <option value="name">Sort: name A-Z</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={hideRequired}
            onChange={(e) => setHideRequired(e.target.checked)}
          />
          Hide required
        </label>
        <span className="ml-auto text-xs text-zinc-500">
          {filtered.length}/{PROPERTIES.length} properties
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr className="border-b border-zinc-200">
                <th className="px-3 py-2.5 font-semibold">Table</th>
                <th className="px-3 py-2.5 font-semibold">Property</th>
                <th className="px-3 py-2.5 font-semibold">Type</th>
                <th className="px-3 py-2.5 font-semibold">Description</th>
                <th className="px-3 py-2.5 font-semibold">Source</th>
                <th className="px-3 py-2.5 font-semibold">Écrit par</th>
                <th className="px-3 py-2.5 font-semibold">Remplissage</th>
                <th className="px-3 py-2.5 text-right font-semibold">Distinct</th>
                <th className="px-3 py-2.5 font-semibold">Top valeurs</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ meta, stats }) => (
                <tr
                  key={`${meta.table}.${meta.name}`}
                  className="border-b border-zinc-100 align-top hover:bg-zinc-50/50"
                >
                  <td className="px-3 py-2 align-top">
                    <Badge className={tableColors[meta.table]}>{meta.table}</Badge>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-xs font-medium text-zinc-900">
                        {meta.name}
                      </code>
                      {meta.required && (
                        <span className="rounded bg-red-50 px-1 py-0.5 text-[9px] font-medium text-red-700 ring-1 ring-red-200">
                          required
                        </span>
                      )}
                      {meta.cascade === 'on-company-fallback-contact' && (
                        <span
                          className="rounded bg-amber-50 px-1 py-0.5 text-[9px] font-medium text-amber-700 ring-1 ring-amber-200"
                          title="Stored on the company, falls back to the contact if no company_id"
                        >
                          cascade
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Badge className={typeColors[meta.type] ?? typeColors.string}>
                      {meta.type}
                    </Badge>
                    {meta.enumValues && (
                      <div
                        className="mt-1 max-w-[180px] truncate text-[10px] text-zinc-500"
                        title={meta.enumValues.join(', ')}
                      >
                        {meta.enumValues.join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="max-w-[320px] px-3 py-2 align-top text-xs text-zinc-700">
                    {meta.description}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-zinc-600">
                    {meta.source}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap gap-1">
                      {meta.writtenBy.map((w) => (
                        <span
                          key={w}
                          className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <FillRateBar rate={stats.rate} count={stats.count} total={stats.total} />
                  </td>
                  <td className="px-3 py-2 text-right align-top tabular-nums text-xs text-zinc-700">
                    {stats.distinct}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {stats.topValues.length === 0 ? (
                      <span className="text-xs italic text-zinc-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {stats.topValues.map(([v, n]) => (
                          <span
                            key={v}
                            className="rounded bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-700 ring-1 ring-zinc-200"
                            title={`${v} (${n})`}
                          >
                            <span className="max-w-[120px] truncate">{v}</span>
                            <span className="ml-1 tabular-nums text-zinc-400">×{n}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tracking-tight ${accent ?? 'text-zinc-900'}`}>
        {value}
      </div>
    </div>
  )
}
