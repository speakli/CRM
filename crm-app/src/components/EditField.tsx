import type { ReactNode } from 'react'

const baseInput =
  'w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500'

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{children}</div>
  )
}

export function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      className={baseInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

export function NumberField({
  value,
  onChange,
  min,
  max,
}: {
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
}) {
  return (
    <input
      type="number"
      className={baseInput}
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function DateField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="date"
      className={baseInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function TextAreaField({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      className={baseInput + ' resize-y leading-snug'}
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

export function SelectField({
  value,
  onChange,
  options,
  allowEmpty = true,
  emptyLabel = '— vide —',
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  allowEmpty?: boolean
  emptyLabel?: string
}) {
  return (
    <select
      className={baseInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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

export function MultiTagField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  const selected = new Set(
    value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  )
  const toggle = (tag: string) => {
    const next = new Set(selected)
    if (next.has(tag)) next.delete(tag)
    else next.add(tag)
    onChange(Array.from(next).join(', '))
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isOn = selected.has(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={
              isOn
                ? 'rounded-md border border-zinc-900 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white'
                : 'rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50'
            }
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
