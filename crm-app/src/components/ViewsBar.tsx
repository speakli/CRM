import { useState } from 'react'
import type { View } from '../lib/views'

export function ViewsBar({
  views,
  activeViewId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onSave,
  isDirty,
}: {
  views: View[]
  activeViewId: string
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onSave: () => Promise<void>
  isDirty: boolean
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [saving, setSaving] = useState(false)

  const startCreate = () => {
    setCreating(true)
    setCreateName('')
  }
  const submitCreate = () => {
    const n = createName.trim()
    if (n) onCreate(n)
    setCreating(false)
    setCreateName('')
  }

  const startRename = (v: View) => {
    setEditingId(v.id)
    setNewName(v.name)
  }
  const submitRename = (id: string) => {
    const n = newName.trim()
    if (n) onRename(id, n)
    setEditingId(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-white p-2">
      {views.map((v) => {
        const active = v.id === activeViewId
        const isEditing = editingId === v.id
        return (
          <div key={v.id} className="flex items-center">
            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={() => submitRename(v.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename(v.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="rounded-md border border-zinc-400 bg-white px-2 py-1 text-sm outline-none"
              />
            ) : (
              <button
                onClick={() => onSelect(v.id)}
                onDoubleClick={() => startRename(v)}
                className={
                  active
                    ? 'rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white'
                    : 'rounded-md px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }
                title="Double-clic pour renommer"
              >
                {v.name}
              </button>
            )}
            {active && views.length > 1 && !isEditing && (
              <button
                onClick={() => {
                  if (confirm(`Supprimer la vue "${v.name}" ?`)) onDelete(v.id)
                }}
                className="ml-0.5 rounded px-1.5 py-1 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-600"
                title="Supprimer cette vue"
              >
                ×
              </button>
            )}
          </div>
        )
      })}

      {creating ? (
        <input
          type="text"
          autoFocus
          placeholder="Nom de la vue…"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          onBlur={submitCreate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitCreate()
            if (e.key === 'Escape') {
              setCreating(false)
              setCreateName('')
            }
          }}
          className="ml-1 rounded-md border border-zinc-400 bg-white px-2 py-1 text-sm outline-none"
        />
      ) : (
        <button
          onClick={startCreate}
          className="ml-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
        >
          + Vue
        </button>
      )}

      {isDirty && (
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="ml-auto rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde…' : '● Sauvegarder'}
        </button>
      )}
    </div>
  )
}
