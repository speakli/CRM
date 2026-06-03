import { useEffect, useRef, useState, type ReactNode } from 'react'

export type Table = 'contacts' | 'companies' | 'calls'

export async function savePatch(
  table: Table,
  id: string,
  patch: Record<string, string>,
): Promise<void> {
  const r = await fetch(`/api/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch }),
  })
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `HTTP ${r.status}`)
  }
}

type SaveFn = (newValue: string) => Promise<void>

const triggerBase =
  'inline-block min-w-[1.75rem] cursor-pointer rounded px-1 -mx-1 hover:bg-zinc-100 transition-colors'

const inputBase =
  'rounded-md border border-zinc-400 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-700'

function ErrorTip({ msg }: { msg: string }) {
  return (
    <span
      title={msg}
      className="ml-1 inline-block rounded bg-red-100 px-1 text-[10px] font-medium text-red-700 ring-1 ring-red-200"
    >
      !
    </span>
  )
}

export function InlineText({
  value,
  onSave,
  placeholder = '—',
  className,
}: {
  value: string
  onSave: SaveFn
  placeholder?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  const commit = async () => {
    if (draft === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
      setDraft(value)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={ref}
        type="text"
        className={inputBase}
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <span className={className}>
      <span
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className={triggerBase}
      >
        {value || <span className="italic text-zinc-400">{placeholder}</span>}
      </span>
      {error && <ErrorTip msg={error} />}
    </span>
  )
}

export function InlineTextArea({
  value,
  onSave,
  placeholder = '—',
  rows = 4,
}: {
  value: string
  onSave: SaveFn
  placeholder?: string
  rows?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  const commit = async () => {
    if (draft === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
      setDraft(value)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        className={inputBase + ' w-full resize-y leading-snug'}
        rows={rows}
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <div>
      <div
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className={
          'min-h-6 cursor-pointer whitespace-pre-wrap rounded px-1 -mx-1 text-sm hover:bg-zinc-100'
        }
      >
        {value || <span className="italic text-zinc-400">{placeholder}</span>}
      </div>
      {error && <ErrorTip msg={error} />}
    </div>
  )
}

export function InlineSelect({
  value,
  options,
  onSave,
  render,
  renderEmpty,
  placeholder = '—',
  allowEmpty = true,
  emptyLabel = '— vide —',
}: {
  value: string
  options: readonly string[]
  onSave: SaveFn
  render?: (v: string) => ReactNode
  renderEmpty?: () => ReactNode
  placeholder?: string
  allowEmpty?: boolean
  emptyLabel?: string
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  const commit = async (next: string) => {
    if (next === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(next)
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <select
        ref={ref}
        className={inputBase}
        defaultValue={value}
        disabled={saving}
        onChange={(e) => void commit(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false)
        }}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  return (
    <span>
      <span onClick={() => setEditing(true)} className={triggerBase}>
        {value ? (
          render ? (
            render(value)
          ) : (
            value
          )
        ) : renderEmpty ? (
          renderEmpty()
        ) : (
          <span className="italic text-zinc-400">{placeholder}</span>
        )}
      </span>
      {error && <ErrorTip msg={error} />}
    </span>
  )
}

export function InlineMultiTag({
  value,
  options,
  onSave,
  render,
  placeholder = '—',
}: {
  value: string
  options: readonly string[]
  onSave: SaveFn
  render?: (tag: string) => ReactNode
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editing) return
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        void commit()
      }
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, draft])

  const tags = (s: string) =>
    s
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

  const commit = async () => {
    const a = tags(draft).sort().join(',')
    const b = tags(value).sort().join(',')
    if (a === b) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(tags(draft).join(', '))
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
      setDraft(value)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const toggle = (tag: string) => {
    const set = new Set(tags(draft))
    if (set.has(tag)) set.delete(tag)
    else set.add(tag)
    setDraft(Array.from(set).join(', '))
  }

  const current = tags(editing ? draft : value)

  return (
    <span ref={ref} className="relative inline-block">
      <span
        onClick={() => {
          if (!editing) {
            setDraft(value)
            setEditing(true)
          }
        }}
        className={triggerBase + ' inline-flex flex-wrap items-center gap-1'}
      >
        {tags(value).length === 0 ? (
          <span className="italic text-zinc-400">{placeholder}</span>
        ) : (
          tags(value).map((t) => (
            <span key={t}>{render ? render(t) : t}</span>
          ))
        )}
        <span className="text-[10px] text-zinc-400">▾</span>
      </span>
      {editing && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-md border border-zinc-300 bg-white py-1 shadow-lg">
          {options.map((opt) => {
            const isOn = current.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                disabled={saving}
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-zinc-800 hover:bg-zinc-100"
              >
                <span
                  className={
                    isOn
                      ? 'flex h-4 w-4 items-center justify-center rounded border border-zinc-900 bg-zinc-900 text-[10px] font-bold text-white'
                      : 'h-4 w-4 rounded border border-zinc-300'
                  }
                >
                  {isOn ? '✓' : ''}
                </span>
                <span className="flex-1">{render ? render(opt) : opt}</span>
              </button>
            )
          })}
          <div className="mt-1 border-t border-zinc-100 px-2.5 py-1 text-[10px] text-zinc-400">
            Clic ailleurs pour fermer
          </div>
        </div>
      )}
      {error && <ErrorTip msg={error} />}
    </span>
  )
}

export function InlineDate({
  value,
  onSave,
  placeholder = '—',
}: {
  value: string
  onSave: SaveFn
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  const commit = async (next: string) => {
    if (next === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(next)
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={ref}
        type="date"
        className={inputBase}
        defaultValue={value}
        disabled={saving}
        onBlur={(e) => void commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <span>
      <span onClick={() => setEditing(true)} className={triggerBase}>
        {value || <span className="italic text-zinc-400">{placeholder}</span>}
      </span>
      {error && <ErrorTip msg={error} />}
    </span>
  )
}

export function InlineNumber({
  value,
  onSave,
  min,
  max,
  placeholder = '—',
}: {
  value: string
  onSave: SaveFn
  min?: number
  max?: number
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  const commit = async () => {
    if (draft === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
      setDraft(value)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        className={inputBase}
        value={draft}
        min={min}
        max={max}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <span>
      <span
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className={triggerBase}
      >
        {value || <span className="italic text-zinc-400">{placeholder}</span>}
      </span>
      {error && <ErrorTip msg={error} />}
    </span>
  )
}
