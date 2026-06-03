import { useMemo, useState } from 'react'
import type { Call, CRMRow } from '../parseTSV'
import { Badge, tempColors } from '../components/Badge'

export function CallsView({
  calls,
  contacts,
  onOpenContact,
}: {
  calls: Call[]
  contacts: CRMRow[]
  onOpenContact: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const contactById = useMemo(
    () => new Map(contacts.map((c) => [c._id, c])),
    [contacts],
  )

  const sortedCalls = useMemo(
    () => [...calls].sort((a, b) => b.date.localeCompare(a.date)),
    [calls],
  )

  const types = useMemo(
    () => Array.from(new Set(calls.map((c) => c.type))).sort(),
    [calls],
  )

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return sortedCalls.filter((call) => {
      if (typeFilter && call.type !== typeFilter) return false
      if (!s) return true
      const ct = contactById.get(call.contact_id)
      const blob = `${call.summary} ${call.type} ${call.date} ${ct?.Contact ?? ''} ${ct?.Company ?? ''}`.toLowerCase()
      return blob.includes(s)
    })
  }, [sortedCalls, contactById, search, typeFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3">
        <input
          type="search"
          placeholder="Search (contact, company, content…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-72 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-zinc-500">
          {filtered.length} call{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {filtered.map((call) => {
          const ct = contactById.get(call.contact_id)
          return (
            <div
              key={call.id}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    {ct ? (
                      <button
                        onClick={() => onOpenContact(ct._id)}
                        className="hover:underline"
                      >
                        {ct.Contact}
                      </button>
                    ) : (
                      call.contact_id
                    )}
                    {ct?.Company && (
                      <>
                        <span className="text-zinc-400"> · </span>
                        <span className="font-normal text-zinc-600">{ct.Company}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">{ct?.['Job title'] ?? '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium tabular-nums text-zinc-700">
                    {call.date}
                  </span>
                  <Badge>{call.type}</Badge>
                  {ct?.Temperature && (
                    <Badge className={tempColors[ct.Temperature]}>{ct.Temperature}</Badge>
                  )}
                </div>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {call.summary}
              </div>
              {call.next_action && (
                <div className="mt-2 text-xs text-zinc-500">→ {call.next_action}</div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
            No calls
          </div>
        )}
      </div>
    </div>
  )
}
