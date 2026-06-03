import { useMemo } from 'react'
import type { CRMRow } from '../parseTSV'
import {
  Badge,
  tempColors,
  funnelStageColors,
} from '../components/Badge'
import {
  categoryBarColors,
  categoryColors,
  type JobCategory,
} from '../lib/categorize'
import { computeStats, daysSince, formatWeekLabel, weekStart } from '../lib/stats'
import { toExternalUrl } from '../lib/url'

function Section({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-5 ${className ?? ''}`}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{title}</h2>
        {subtitle && <span className="text-xs text-zinc-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function HBar({
  label,
  count,
  max,
  barClass,
  badge,
}: {
  label: React.ReactNode
  count: number
  max: number
  barClass?: string
  badge?: React.ReactNode
}) {
  const pct = max > 0 ? Math.max(2, (count / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 shrink-0 truncate text-xs text-zinc-700">{label}</div>
      <div className="relative h-6 flex-1 rounded bg-zinc-100">
        <div
          className={`absolute inset-y-0 left-0 rounded ${barClass ?? 'bg-zinc-400'}`}
          style={{ width: `${pct}%` }}
        />
        <div className="relative flex h-full items-center px-2 text-xs font-medium text-zinc-800">
          {count}
        </div>
      </div>
      {badge}
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tracking-tight ${accent ?? 'text-zinc-900'}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  )
}

function bucketEmployees(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  let n: number
  if (v.endsWith('+')) n = parseInt(v.slice(0, -1), 10)
  else if (v.includes('-')) {
    const [a, b] = v.split('-').map((x) => parseInt(x, 10))
    if (Number.isNaN(a) || Number.isNaN(b)) return null
    n = (a + b) / 2
  } else n = parseInt(v, 10)
  if (Number.isNaN(n)) return null
  if (n <= 10) return '1-10'
  if (n <= 50) return '11-50'
  if (n <= 200) return '51-200'
  if (n <= 1000) return '201-1000'
  return '1000+'
}

const EMPLOYEES_BUCKETS = ['1-10', '11-50', '51-200', '201-1000', '1000+']

export function DashboardView({ data }: { data: CRMRow[] }) {
  const stats = useMemo(() => computeStats(data), [data])

  const sortedCategories = useMemo(
    () =>
      Object.entries(stats.byCategory)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]) as [JobCategory, number][],
    [stats],
  )

  const sortedWeeks = useMemo(() => {
    return Object.entries(stats.byWeek).sort(([a], [b]) => a.localeCompare(b))
  }, [stats])

  const topOpportunities = useMemo(
    () => data.filter((r) => r.Temperature === 'Chaud'),
    [data],
  )

  const toRelance = useMemo(
    () =>
      data
        .filter(
          (r) =>
            r.Temperature === 'Tiède' &&
            (Number(r['Calls count']) || 0) > 0 &&
            daysSince(r['Last contact']) > 21,
        )
        .sort(
          (a, b) =>
            daysSince(b['Last contact']) - daysSince(a['Last contact']),
        ),
    [data],
  )

  const recentLeads = useMemo(
    () =>
      [...data]
        .filter((r) => r['Date added'])
        .sort((a, b) => b['Date added'].localeCompare(a['Date added']))
        .slice(0, 6),
    [data],
  )

  const topCompanies = useMemo(
    () =>
      Object.entries(stats.byCompany)
        .filter(([, v]) => v > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    [stats],
  )

  const maxCategoryCount = Math.max(1, ...sortedCategories.map(([, v]) => v))
  const maxWeekCount = Math.max(1, ...sortedWeeks.map(([, v]) => v))

  const callRate = stats.total > 0 ? (stats.prospectsWithCall / stats.total) * 100 : 0
  const hotRate = stats.total > 0 ? (stats.totalHot / stats.total) * 100 : 0

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
        No data
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total prospects" value={stats.total} hint="in the CRM" />
        <KpiCard
          label="Total companies"
          value={stats.totalCompanies}
          hint="distinct"
          accent="text-zinc-800"
        />
        <KpiCard
          label="Calls made"
          value={stats.totalCalls}
          hint={`${stats.prospectsWithCall} prospects (${callRate.toFixed(0)}%)`}
          accent="text-blue-700"
        />
        <KpiCard
          label="Hot prospects"
          value={stats.totalHot}
          hint={`${hotRate.toFixed(0)}% of pipe`}
          accent="text-red-700"
        />
      </div>

      <Section title="Personas" subtitle="by job category (auto-classified)">
        <div className="space-y-1.5">
          {sortedCategories.map(([cat, count]) => (
            <HBar
              key={cat}
              label={
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${categoryBarColors[cat]}`}
                  />
                  {cat}
                </span>
              }
              count={count}
              max={maxCategoryCount}
              barClass={categoryBarColors[cat]}
              badge={
                stats.callsPerCategory[cat] > 0 ? (
                  <Badge className="bg-blue-50 text-blue-700 ring-blue-200">
                    {stats.callsPerCategory[cat]} call{stats.callsPerCategory[cat] > 1 ? 's' : ''}
                  </Badge>
                ) : null
              }
            />
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title="Persona × Performance" subtitle="calls, temperatures">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr className="border-b border-zinc-100">
                  <th className="py-1.5 pr-3 font-medium">Category</th>
                  <th className="py-1.5 pr-3 text-right font-medium">N</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Calls</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Chaud</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Tiède</th>
                  <th className="py-1.5 text-right font-medium">Froid</th>
                </tr>
              </thead>
              <tbody>
                {stats.matrix
                  .sort((a, b) => b.total - a.total)
                  .map((m) => (
                    <tr key={m.category} className="border-b border-zinc-50 last:border-0">
                      <td className="py-1.5 pr-3">
                        <Badge className={categoryColors[m.category]}>{m.category}</Badge>
                      </td>
                      <td className="py-1.5 pr-3 text-right font-medium tabular-nums text-zinc-700">
                        {m.total}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-zinc-600">
                        {m.calls}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-red-700">
                        {m.hot || '—'}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-amber-700">
                        {m.mid || '—'}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-sky-700">
                        {m.cold || '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Funnel" subtitle="conversion between stages">
          {(() => {
            const steps = [
              { label: 'All prospects', count: stats.total, color: 'bg-zinc-400' },
              {
                label: '≥ 1 call',
                count: stats.prospectsWithCall,
                color: 'bg-blue-500',
              },
              {
                label: 'Discovery done',
                count: stats.byFunnel['Disco'] || 0,
                color: 'bg-purple-500',
              },
              {
                label: 'Warm + Hot',
                count: stats.totalMid + stats.totalHot,
                color: 'bg-amber-500',
              },
              { label: 'Hot only', count: stats.totalHot, color: 'bg-red-500' },
            ]
            const max = stats.total
            return (
              <div className="space-y-2">
                {steps.map((s, i) => {
                  const pct = max > 0 ? (s.count / max) * 100 : 0
                  const dropPct = i > 0 && steps[i - 1].count > 0 ? (s.count / steps[i - 1].count) * 100 : 100
                  return (
                    <div key={s.label}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-zinc-700">{s.label}</span>
                        <span className="text-xs tabular-nums text-zinc-500">
                          {s.count} ({pct.toFixed(0)}%)
                          {i > 0 && (
                            <span className="ml-2 text-zinc-400">
                              ↓ {dropPct.toFixed(0)}% vs previous step
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1 h-3 rounded bg-zinc-100">
                        <div
                          className={`h-full rounded ${s.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title="Funnel stage" subtitle="companies (cascaded)">
          {(() => {
            const entries = Object.entries(stats.byFunnel).sort((a, b) => b[1] - a[1])
            const max = Math.max(1, ...entries.map(([, v]) => v))
            return (
              <div className="space-y-1.5">
                {entries.map(([k, v]) => (
                  <HBar
                    key={k}
                    label={<Badge className={funnelStageColors[k]}>{k}</Badge>}
                    count={v}
                    max={max}
                    barClass="bg-zinc-300"
                  />
                ))}
              </div>
            )
          })()}
        </Section>
        <Section title="Temperature" subtitle="contacts">
          {(() => {
            const order = ['Chaud', 'Tiède', 'Froid'] as const
            const max = Math.max(1, ...order.map((k) => stats.byTemp[k] || 0))
            return (
              <div className="space-y-1.5">
                {order.map((k) => (
                  <HBar
                    key={k}
                    label={<Badge className={tempColors[k]}>{k}</Badge>}
                    count={stats.byTemp[k] || 0}
                    max={max}
                    barClass={
                      k === 'Chaud' ? 'bg-red-300' : k === 'Tiède' ? 'bg-amber-300' : 'bg-sky-300'
                    }
                  />
                ))}
              </div>
            )
          })()}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title="Employees distribution (companies)" subtitle="bucketed by headcount">
          {(() => {
            const seen = new Set<string>()
            const counts: Record<string, number> = {}
            for (const b of EMPLOYEES_BUCKETS) counts[b] = 0
            for (const r of data) {
              const co = r._company
              if (!co || seen.has(co.id)) continue
              seen.add(co.id)
              const bucket = bucketEmployees(co.employees)
              if (bucket) counts[bucket]++
            }
            const max = Math.max(1, ...Object.values(counts))
            return (
              <div className="space-y-1.5">
                {EMPLOYEES_BUCKETS.map((b) => (
                  <HBar key={b} label={b} count={counts[b]} max={max} barClass="bg-blue-400" />
                ))}
              </div>
            )
          })()}
        </Section>

      </div>

      <Section title="Leads added per week" subtitle="velocity">
        <div className="space-y-1.5">
          {sortedWeeks.map(([wk, v]) => (
            <HBar
              key={wk}
              label={`week of ${formatWeekLabel(wk)}`}
              count={v}
              max={maxWeekCount}
              barClass={
                wk === weekStart(new Date().toISOString().slice(0, 10))
                  ? 'bg-emerald-500'
                  : 'bg-zinc-400'
              }
            />
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section
          title="Top opportunities"
          subtitle="Hot prospects — priority follow-up"
        >
          {topOpportunities.length === 0 ? (
            <div className="text-sm italic text-zinc-400">None</div>
          ) : (
            <div className="space-y-2">
              {topOpportunities.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-zinc-50 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {r.Contact} <span className="text-zinc-400">·</span>{' '}
                      <span className="font-normal text-zinc-600">{r.Company || '—'}</span>
                    </div>
                    <div className="truncate text-xs text-zinc-500">{r['Job title']}</div>
                  </div>
                  <div className="ml-3 flex shrink-0 gap-1">
                    {r.LinkedIn && (
                      <a
                        href={toExternalUrl(r.LinkedIn)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200"
                      >
                        in
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="To follow up" subtitle="Warm + last contact > 21 days">
          {toRelance.length === 0 ? (
            <div className="text-sm italic text-zinc-400">
              No pending follow-ups — all up to date
            </div>
          ) : (
            <div className="space-y-2">
              {toRelance.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-zinc-50 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {r.Contact}{' '}
                      <span className="text-zinc-400">·</span>{' '}
                      <span className="font-normal text-zinc-600">{r.Company}</span>
                    </div>
                    <div className="truncate text-xs text-zinc-500">{r['Next action']}</div>
                  </div>
                  <Badge className="bg-amber-50 text-amber-700 ring-amber-200">
                    {daysSince(r['Last contact'])}d
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Recent leads added" subtitle="recent activity">
        <div className="space-y-2">
          {recentLeads.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-zinc-50 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-900">
                  {r.Contact}
                  {r.Company && (
                    <>
                      <span className="text-zinc-400"> · </span>
                      <span className="font-normal text-zinc-600">{r.Company}</span>
                    </>
                  )}
                </div>
                <div className="truncate text-xs text-zinc-500">{r['Job title']}</div>
              </div>
              <span className="text-xs tabular-nums text-zinc-500">{r['Date added']}</span>
            </div>
          ))}
        </div>
      </Section>

      {topCompanies.length > 0 && (
        <Section title="Top companies" subtitle="accounts with ≥ 2 prospects">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {topCompanies.map(([co, n]) => (
              <div
                key={co}
                className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2"
              >
                <span className="truncate text-sm font-medium text-zinc-800">{co}</span>
                <Badge>{n} prospects</Badge>
              </div>
            ))}
          </div>
        </Section>
      )}

      {Object.keys(stats.bySource).length > 1 && (
        <Section title="Sources">
          <div className="space-y-1.5">
            {Object.entries(stats.bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([src, n]) => (
                <HBar
                  key={src}
                  label={src}
                  count={n}
                  max={Math.max(...Object.values(stats.bySource))}
                  barClass="bg-zinc-500"
                />
              ))}
          </div>
        </Section>
      )}
    </div>
  )
}
