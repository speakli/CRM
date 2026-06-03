import { useEffect, useRef, useState } from 'react'
import type { CRMList } from '../lib/lists'
import {
  addIdsToList,
  slugifyListName,
  todayISO,
  uniqueListId,
} from '../lib/lists'

export function SaveToListPanel({
  selectedIds,
  lists,
  onSaveLists,
  onClearSelection,
}: {
  selectedIds: string[]
  lists: CRMList[]
  onSaveLists: (next: CRMList[]) => Promise<void>
  onClearSelection: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [targetIds, setTargetIds] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTargetIds(new Set())
      setNewName('')
      setMessage(null)
    }
  }, [isOpen])

  const toggle = (id: string) => {
    setTargetIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const trimmedNew = newName.trim()
  const hasTarget = targetIds.size > 0 || trimmedNew.length > 0

  const submit = async () => {
    if (!hasTarget || busy || selectedIds.length === 0) return
    setBusy(true)
    setMessage(null)
    try {
      let next = [...lists]
      const targetNames: string[] = []
      let maxAdded = 0

      for (const list of lists) {
        if (!targetIds.has(list.id)) continue
        const { list: updated, addedCount } = addIdsToList(list, selectedIds)
        next = next.map((l) => (l.id === list.id ? updated : l))
        targetNames.push(list.name)
        maxAdded = Math.max(maxAdded, addedCount)
      }

      if (trimmedNew) {
        const id = uniqueListId(next, slugifyListName(trimmedNew) || 'list')
        const now = todayISO()
        const created = {
          id,
          name: trimmedNew,
          ids: [...new Set(selectedIds)],
          created_at: now,
          updated_at: now,
        }
        next = [...next, created]
        targetNames.push(created.name)
        maxAdded = Math.max(maxAdded, created.ids.length)
      }

      await onSaveLists(next)
      const skipped = selectedIds.length - maxAdded
      const labelLists = targetNames.length === 1 ? `"${targetNames[0]}"` : `${targetNames.length} lists`
      setMessage(
        skipped > 0
          ? `${maxAdded}/${selectedIds.length} added to ${labelLists} (${skipped} already present)`
          : `${maxAdded} added to ${labelLists}`,
      )
      setIsOpen(false)
      onClearSelection()
    } catch (e) {
      setMessage(`Error: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
      >
        Save {selectedIds.length} to list <span className="text-[10px] opacity-70">▾</span>
      </button>

      {message && !isOpen && (
        <div className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-emerald-700">
          {message}
        </div>
      )}

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-md border border-zinc-200 bg-white p-2 shadow-lg">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Add {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} to…
          </div>

          {lists.length === 0 ? (
            <div className="px-2 py-2 text-xs text-zinc-400">No list yet.</div>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {lists.map((l) => {
                const checked = targetIds.has(l.id)
                return (
                  <label
                    key={l.id}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm ${
                      checked ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(l.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1 truncate text-zinc-800">{l.name}</span>
                    <span className="text-xs tabular-nums text-zinc-400">{l.ids.length}</span>
                  </label>
                )
              })}
            </div>
          )}

          <div className="my-1 h-px bg-zinc-100" />
          <div className="px-1 py-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="+ Nouvelle liste…"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-zinc-100 pt-2">
            <button
              onClick={() => setIsOpen(false)}
              className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
            >
              Annuler
            </button>
            <button
              onClick={() => void submit()}
              disabled={!hasTarget || busy}
              className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {busy ? 'Save…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
