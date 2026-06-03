import { useEffect, useRef, useState, type ReactNode } from 'react'

type MultiSelectFilterProps = {
  label: string
  options: readonly string[]
  value: string | string[] | undefined
  onChange: (next: string[]) => void
  /** Optional custom render for option (e.g., to show a badge) */
  renderOption?: (opt: string) => ReactNode
}

export function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
  renderOption,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected: string[] = Array.isArray(value) ? value : value ? [value] : []

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  const buttonLabel =
    selected.length === 0
      ? label
      : selected.length === 1
        ? selected[0]
        : `${selected[0]} +${selected.length - 1}`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-md border bg-white px-2 py-1.5 text-sm ${
          selected.length > 0
            ? 'border-zinc-700 text-zinc-900 ring-1 ring-zinc-200'
            : 'border-zinc-300 text-zinc-600'
        } hover:bg-zinc-50`}
      >
        {buttonLabel} <span className="ml-1 text-[10px] text-zinc-400">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-72 min-w-[180px] overflow-y-auto rounded-md border border-zinc-300 bg-white py-1 shadow-lg">
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs italic text-zinc-400">Aucune valeur</div>
          )}
          {options.map((opt) => {
            const isOn = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm text-zinc-800 hover:bg-zinc-100"
              >
                <span
                  className={
                    isOn
                      ? 'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-zinc-900 bg-zinc-900 text-[10px] font-bold text-white'
                      : 'h-4 w-4 flex-shrink-0 rounded border border-zinc-300'
                  }
                >
                  {isOn ? '✓' : ''}
                </span>
                <span className="flex-1">{renderOption ? renderOption(opt) : opt}</span>
              </button>
            )
          })}
          {selected.length > 0 && (
            <div className="mt-1 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full px-2.5 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-100"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
