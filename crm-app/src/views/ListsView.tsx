import { useState } from 'react'
import type { CRMList, ListsConfig, ListTable } from '../lib/lists'
import { slugifyListName, uniqueListId, todayISO } from '../lib/lists'

export function ListsView({
  lists,
  onOpenList,
  onSaveLists,
}: {
  lists: ListsConfig
  onOpenList: (table: ListTable, id: string) => void
  onSaveLists: (next: ListsConfig) => Promise<void>
}) {
  return (
    <div className="space-y-6">
      <Section
        title="Contact lists"
        table="contacts"
        items={lists.contacts}
        onOpen={(id) => onOpenList('contacts', id)}
        onCreate={async (name) => {
          const id = uniqueListId(lists.contacts, slugifyListName(name) || 'list')
          const now = todayISO()
          const newList: CRMList = { id, name, ids: [], created_at: now, updated_at: now }
          await onSaveLists({ ...lists, contacts: [...lists.contacts, newList] })
        }}
        onDelete={async (id) => {
          await onSaveLists({ ...lists, contacts: lists.contacts.filter((l) => l.id !== id) })
        }}
        onRename={async (id, name) => {
          await onSaveLists({
            ...lists,
            contacts: lists.contacts.map((l) => (l.id === id ? { ...l, name, updated_at: todayISO() } : l)),
          })
        }}
      />
      <Section
        title="Company lists"
        table="companies"
        items={lists.companies}
        onOpen={(id) => onOpenList('companies', id)}
        onCreate={async (name) => {
          const id = uniqueListId(lists.companies, slugifyListName(name) || 'list')
          const now = todayISO()
          const newList: CRMList = { id, name, ids: [], created_at: now, updated_at: now }
          await onSaveLists({ ...lists, companies: [...lists.companies, newList] })
        }}
        onDelete={async (id) => {
          await onSaveLists({ ...lists, companies: lists.companies.filter((l) => l.id !== id) })
        }}
        onRename={async (id, name) => {
          await onSaveLists({
            ...lists,
            companies: lists.companies.map((l) => (l.id === id ? { ...l, name, updated_at: todayISO() } : l)),
          })
        }}
      />
    </div>
  )
}

function Section({
  title,
  table,
  items,
  onOpen,
  onCreate,
  onDelete,
  onRename,
}: {
  title: string
  table: ListTable
  items: CRMList[]
  onOpen: (id: string) => void
  onCreate: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const submitCreate = async () => {
    const n = name.trim()
    if (!n) {
      setCreating(false)
      return
    }
    await onCreate(n)
    setName('')
    setCreating(false)
  }
  const submitRename = async (id: string) => {
    const n = renameValue.trim()
    if (n) await onRename(id, n)
    setRenamingId(null)
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {title} <span className="ml-1 text-zinc-400">({items.length})</span>
        </h2>
        {creating ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              placeholder="List name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void submitCreate()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitCreate()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setName('')
                }
              }}
              className="rounded-md border border-zinc-400 bg-white px-2 py-1 text-sm outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => {
              setCreating(true)
              setName('')
            }}
            className="rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            + New list
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
          No list yet. Select {table === 'contacts' ? 'contacts' : 'companies'} in the dedicated view, then click "Save to list".
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => {
            const isRenaming = renamingId === l.id
            return (
              <div
                key={l.id}
                className="group flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 hover:border-zinc-300 hover:bg-zinc-50"
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void submitRename(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void submitRename(l.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="flex-1 rounded-md border border-zinc-400 bg-white px-2 py-0.5 text-sm outline-none"
                  />
                ) : (
                  <button
                    onClick={() => onOpen(l.id)}
                    onDoubleClick={() => {
                      setRenamingId(l.id)
                      setRenameValue(l.name)
                    }}
                    className="flex-1 truncate text-left text-sm font-medium text-zinc-800 hover:text-zinc-900"
                    title="Double-clic pour renommer"
                  >
                    {l.name}
                  </button>
                )}
                <span className="ml-2 text-xs tabular-nums text-zinc-500">{l.ids.length}</span>
                <button
                  onClick={() => {
                    if (confirm(`Delete the list "${l.name}"?`)) void onDelete(l.id)
                  }}
                  className="ml-2 rounded px-1.5 py-0.5 text-xs text-zinc-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  aria-label="Delete this list"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
