import { useMemo } from 'react'
import type { CRMRow } from '../parseTSV'
import { type AuditFile } from '../lib/audit'
import { toExternalUrl } from '../lib/url'
import {
  Badge,
  tempColors,
  funnelStageColors,
} from '../components/Badge'
import {
  InlineText,
  InlineTextArea,
  InlineSelect,
  InlineDate,
  savePatch,
} from '../components/InlineEdit'
import {
  TEMPERATURE_OPTIONS,
  FUNNEL_STAGE_OPTIONS,
  SOURCE_OPTIONS,
} from '../lib/fieldOptions'

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm text-zinc-800">
        {value || <span className="italic text-zinc-400">—</span>}
      </div>
    </div>
  )
}

export function ContactDetailView({
  contact,
  contacts,
  onBack,
  onOpenCompany,
  onOpenContact,
  onRefresh,
  audit,
}: {
  contact: CRMRow
  contacts: CRMRow[]
  onBack: () => void
  onOpenCompany: (id: string) => void
  onOpenContact: (id: string) => void
  onRefresh: () => Promise<void>
  audit: AuditFile | null
}) {
  void audit
  const coworkers = useMemo(() => {
    if (!contact._company_id) return []
    return contacts.filter(
      (c) => c._company_id === contact._company_id && c._id !== contact._id,
    )
  }, [contacts, contact])

  const sortedCalls = useMemo(
    () => [...contact._calls].sort((a, b) => b.date.localeCompare(a.date)),
    [contact._calls],
  )

  const save = async (patch: Record<string, string>) => {
    await savePatch('contacts', contact._id, patch)
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
        <span className="text-xs text-zinc-500">Contact · click any field to edit</span>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              <InlineText value={contact.Contact} onSave={(v) => save({ name: v })} />
            </h1>
            <div className="mt-1 text-sm text-zinc-600">
              <InlineText
                value={contact['Job title']}
                onSave={(v) => save({ job_title: v })}
                placeholder="Job title"
              />
              {contact._company && (
                <>
                  <span className="text-zinc-400"> @ </span>
                  <button
                    onClick={() => onOpenCompany(contact._company!.id)}
                    className="font-medium text-zinc-700 hover:underline"
                  >
                    {contact._company.name}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {contact._effective_funnel_stage ? (
              <Badge className={funnelStageColors[contact._effective_funnel_stage]}>
                {contact._effective_funnel_stage}
                {contact._company?.funnel_stage && (
                  <span className="ml-1 text-[9px] font-normal opacity-60">(company)</span>
                )}
              </Badge>
            ) : null}
            <InlineSelect
              value={contact.Temperature}
              options={TEMPERATURE_OPTIONS}
              onSave={(v) => save({ temperature: v })}
              render={(v) => <Badge className={tempColors[v]}>{v}</Badge>}
              placeholder="temp?"
            />
            {contact.LinkedIn ? (
              <a
                href={toExternalUrl(contact.LinkedIn)}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                LinkedIn ↗
              </a>
            ) : null}
          </div>
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
                  Job title
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineText
                    value={contact['Job title']}
                    onSave={(v) => save({ job_title: v })}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Company
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  {contact._company ? (
                    <button
                      onClick={() => onOpenCompany(contact._company!.id)}
                      className="font-medium text-zinc-700 hover:underline"
                    >
                      {contact._company.name}
                    </button>
                  ) : (
                    <span className="italic text-zinc-400">—</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Temperature
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineSelect
                    value={contact.Temperature}
                    options={TEMPERATURE_OPTIONS}
                    onSave={(v) => save({ temperature: v })}
                    render={(v) => <Badge className={tempColors[v]}>{v}</Badge>}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Date added
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineDate
                    value={contact['Date added']}
                    onSave={(v) => save({ created_at: v })}
                  />
                </div>
              </div>
              {contact._company ? (
                <MetaRow
                  label="Funnel (inherited from company)"
                  value={
                    contact._company.funnel_stage ? (
                      <Badge className={funnelStageColors[contact._company.funnel_stage]}>
                        {contact._company.funnel_stage}
                      </Badge>
                    ) : null
                  }
                />
              ) : (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Funnel stage
                  </div>
                  <div className="mt-0.5 text-sm text-zinc-800">
                    <InlineSelect
                      value={contact._funnel_stage}
                      options={FUNNEL_STAGE_OPTIONS}
                      onSave={(v) => save({ funnel_stage: v })}
                      render={(v) => (
                        <Badge className={funnelStageColors[v]}>{v}</Badge>
                      )}
                    />
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  LinkedIn (URL)
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineText
                    value={contact.LinkedIn}
                    onSave={(v) => save({ linkedin: v })}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Email
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineText
                    value={contact._email}
                    onSave={(v) => save({ email: v })}
                    placeholder="e.g. name@company.com"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Phone
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineText
                    value={contact._phone}
                    onSave={(v) => save({ phone: v })}
                    placeholder="e.g. +33 6 12 34 56 78"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Source
                </div>
                <div className="mt-0.5 text-sm text-zinc-800">
                  <InlineSelect
                    value={contact.Source}
                    options={SOURCE_OPTIONS}
                    onSave={(v) => save({ source: v })}
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
              value={contact['Next action']}
              onSave={(v) => save({ next_action: v })}
              rows={2}
            />
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Audit
            </h2>
            <div className="space-y-1 text-xs text-zinc-600">
              <div>
                Created by <strong>{contact._created_by || '—'}</strong> on{' '}
                {contact._created_at || '—'}
              </div>
              <div>
                Updated by <strong>{contact._updated_by || '—'}</strong> on{' '}
                {contact._updated_at || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Summary (360 view)
            </h2>
            <InlineTextArea
              value={contact.Summary}
              onSave={(v) => save({ recap: v })}
              rows={6}
              placeholder="No summary yet"
            />
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Calls ({sortedCalls.length})
            </h2>
            {sortedCalls.length === 0 ? (
              <div className="text-sm italic text-zinc-400">No calls</div>
            ) : (
              <div className="space-y-3">
                {sortedCalls.map((call) => (
                  <div
                    key={call.id}
                    className="rounded-md border border-zinc-200 bg-white p-3"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-medium tabular-nums text-zinc-700">
                        {call.date}
                      </span>
                      <Badge>{call.type}</Badge>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
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

          {coworkers.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
                Other contacts at {contact.Company} ({coworkers.length})
              </h2>
              <div className="space-y-2">
                {coworkers.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => onOpenContact(c._id)}
                    className="flex w-full items-baseline justify-between gap-3 rounded-md border border-zinc-100 bg-zinc-50/50 p-3 text-left hover:bg-zinc-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-zinc-900">
                        {c.Contact}
                      </div>
                      <div className="truncate text-xs text-zinc-500">{c['Job title']}</div>
                    </div>
                    {c.Temperature && (
                      <Badge className={tempColors[c.Temperature]}>{c.Temperature}</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
