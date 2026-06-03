import { useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDefShort } from './ColumnConfig'

type AddFilterPopoverProps<T> = {
  columns: ColumnDefShort[]
  data: T[]
  /** Returns the cell value for a given row + column id. Used to populate value suggestions. */
  getCellValue: (row: T, columnId: string) => unknown
  onAdd: (id: string, value: string | string[]) => void
}

export function AddFilterPopover<T>({
  columns,
  data,
  getCellValue,
  onAdd,
}: AddFilterPopoverProps<T>) {
  const [open, setOpen] = useState(false)
  const [colId, setColId] = useState('')
  const [value, setValue] = useState('')
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const suggestions = useMemo<string[]>(() => {
    if (!colId) return []
    const set = new Set<string>()
    for (const r of data) {
      const v = getCellValue(r, colId)
      if (typeof v === 'string' && v) {
        set.add(v)
      } else if (typeof v === 'number') {
        set.add(String(v))
      }
    }
    return Array.from(set).sort()
  }, [colId, data, getCellValue])

  const handleAdd = () => {
    if (!colId) return
    // Multi-select path
    if (selectedValues.length > 0) {
      onAdd(colId, selectedValues.length === 1 ? selectedValues[0] : selectedValues)
      setColId('')
      setSelectedValues([])
      setValue('')
      setOpen(false)
      return
    }
    // Single value path
    if (value.trim()) {
      onAdd(colId, value.trim())
      setColId('')
      setValue('')
      setOpen(false)
    }
  }

  const toggleValue = (v: string) => {
    setSelectedValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        + Filtre
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 flex w-72 flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Ajouter un filtre
          </div>
          <select
            value={colId}
            onChange={(e) => {
              setColId(e.target.value)
              setValue('')
              setSelectedValues([])
            }}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Colonne...</option>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {colId && (
            <>
              {suggestions.length > 0 && suggestions.length <= 30 ? (
                <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border border-zinc-300 bg-white px-1 py-1">
                  {suggestions.map((s) => {
                    const isOn = selectedValues.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleValue(s)}
                        className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm text-zinc-800 hover:bg-zinc-100"
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
                        <span className="flex-1 truncate">{s}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Valeur..."
                    list={`suggestions-${colId}`}
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                  />
                  {suggestions.length > 30 && (
                    <datalist id={`suggestions-${colId}`}>
                      {suggestions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  )}
                </>
              )}
              <button
                onClick={handleAdd}
                disabled={!value.trim() && selectedValues.length === 0}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Ajouter le filtre {selectedValues.length > 1 ? `(${selectedValues.length} valeurs)` : ''}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
