import { useMemo } from 'react'
import type { Company, CRMRow } from '../parseTSV'
import { type AuditFile, getFieldAudit } from '../lib/audit'
import { toExternalUrl } from '../lib/url'
import { FieldAuditIcon } from '../components/FieldAuditIcon'
import {
  Badge,
  tempColors,
  funnelStageColors,
} from '../components/Badge'
import {
  InlineText,
  InlineTextArea,
  InlineSelect,
  savePatch,
} from '../components/InlineEdit'
import {
  FUNNEL_STAGE_OPTIONS,
} from '../lib/fieldOptions'

export function CompanyDetailView({
  company,
  contacts,
  onBack,
  onOpenContact,
  onRefresh,
  audit,
}: {
  company: Company
  contacts: CRMRow[]
  onBack: () => void
  onOpenContact: (id: string) => void
  onRefresh: () => Promise<void>
  audit: AuditFile | null
}) {
  const fieldAudit = (field: string) => getFieldAudit(audit, 'companies', company.id, field)
  void fieldAudit
  void FieldAuditIcon
  const employees = useMemo(
    () => contacts.filter((c) => c._company_id === company.id),
    [contacts, company.id],
  )

  const allCalls = useMemo(() => {
    return employees
      .flatMap((c) => c._calls.map((call) => ({ call, contact: c })))
      .sort((a, b) => b.call.date.localeCompare(a.call.date))
  }, [employees])

  const save = async (patch: Record<string, string>) => {
    await savePatch('companies', company.id, patch)
    await onRefresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ← Back
        </button>
        <span className="text-xs text-zinc-500">Company · click any field to edit</span>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              <InlineText value={company.name} onSave={(v) => save({ name: v })} />
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <InlineSelect
                value={company.funnel_stage}
                options={FUNNEL_STAGE_OPTIONS}
                onSave={(v) => save({ funnel_stage: v })}
                render={(v) => (
                  <Badge className={funnelStageColors[v]}>{v}</Badge>
                )}
                placeholder="funnel?"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>
        <div className="mt-3 text-sm text-zinc-700">
          <InlineTextArea
            value={company.summary}
            onSave={(v) => save({ summary: v })}
            rows={2}
            placeholder="Summary (1-2 sentences about what the company does)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Key info
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Name
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineText value={company.name} onSave={(v) => save({ name: v })} />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  LinkedIn
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-sm text-zinc-800">
                  <InlineText
                    value={company.linkedin_url}
                    onSave={(v) => save({ linkedin_url: v })}
                    placeholder="https://www.linkedin.com/company/..."
                  />
                  {company.linkedin_url && (
                    <a
                      href={toExternalUrl(company.linkedin_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs text-blue-600 hover:text-blue-900"
                      title="Open in LinkedIn"
                    >
                      ↗
                    </a>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Tagline
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineText
                    value={company.tagline}
                    onSave={(v) => save({ tagline: v })}
                    placeholder="One-line pitch"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Funnel stage
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineSelect
                    value={company.funnel_stage}
                    options={FUNNEL_STAGE_OPTIONS}
                    onSave={(v) => save({ funnel_stage: v })}
                    render={(v) => (
                      <Badge className={funnelStageColors[v]}>{v}</Badge>
                    )}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Employees
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineText
                    value={company.employees}
                    onSave={(v) => save({ employees: v })}
                    placeholder="e.g. 25 or 11-50 or 500+"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Next action
            </h2>
            <InlineTextArea
              value={company.next_action}
              onSave={(v) => save({ next_action: v })}
              rows={2}
              placeholder="Commercial action at the company level"
            />
            {!company.next_action &&
              (() => {
                const fallback = employees
                  .filter((c) => c['Next action'])
                  .sort((a, b) => b._calls.length - a._calls.length)[0]
                if (!fallback) return null
                return (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    <span className="font-medium">Contact fallback:</span>{' '}
                    <button
                      onClick={() => onOpenContact(fallback._id)}
                      className="font-medium hover:underline"
                    >
                      {fallback.Contact}
                    </button>{' '}
                    → {fallback['Next action']}
                  </div>
                )
              })()}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Notes
            </h2>
            <InlineTextArea
              value={company.notes}
              onSave={(v) => save({ notes: v })}
              rows={3}
              placeholder="Internal notes"
            />
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Audit
            </h2>
            <div className="space-y-1 text-xs text-zinc-600">
              <div>
                Created by <strong>{company.created_by || '—'}</strong> on{' '}
                {company.created_at || '—'}
              </div>
              <div>
                Updated by <strong>{company.updated_by || '—'}</strong> on{' '}
                {company.updated_at || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Employees ({employees.length})
            </h2>
            {employees.length === 0 ? (
              <div className="text-sm italic text-zinc-400">No contact linked</div>
            ) : (
              <div className="space-y-2">
                {employees.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => onOpenContact(c._id)}
                    className="flex w-full items-baseline justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50/50 p-3 text-left hover:bg-zinc-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-900">
                        {c.Contact}
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        {c['Job title'] || '—'}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {c.Temperature && (
                        <Badge className={tempColors[c.Temperature]}>{c.Temperature}</Badge>
                      )}
                      <span className="text-xs text-zinc-400">
                        {c._calls.length} call{c._calls.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
                Calls timeline ({allCalls.length})
              </h2>
              <span className="text-xs text-zinc-400">all employees combined</span>
            </div>
            {allCalls.length === 0 ? (
              <div className="text-sm italic text-zinc-400">No calls</div>
            ) : (
              <div className="space-y-3">
                {allCalls.map(({ call, contact }) => (
                  <div
                    key={call.id}
                    className="rounded-md border border-zinc-200 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <button
                        onClick={() => onOpenContact(contact._id)}
                        className="text-sm font-medium text-zinc-900 hover:underline"
                      >
                        {contact.Contact}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums text-zinc-700">
                          {call.date}
                        </span>
                        <Badge>{call.type}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
                      {call.summary}
                    </div>
                    {call.next_action && (
                      <div className="mt-2 text-xs text-zinc-500">→ {call.next_action}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
