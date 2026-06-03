import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnSizingState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { CRMRow } from '../parseTSV'
import {
  Badge,
  tempColors,
  funnelStageColors,
} from '../components/Badge'
import { categorizeJob, categoryColors } from '../lib/categorize'
import { InlineSelect, InlineText, savePatch } from '../components/InlineEdit'
import {
  TEMPERATURE_OPTIONS,
  FUNNEL_STAGE_OPTIONS,
  SOURCE_OPTIONS,
} from '../lib/fieldOptions'
import {
  type View,
  type FilterRule,
  type SortRule,
  viewsEqual,
  slugifyName,
  uniqueViewId,
} from '../lib/views'
import { ViewsBar } from '../components/ViewsBar'
import { ColumnConfig, type ColumnDefShort } from '../components/ColumnConfig'
import { AddFilterPopover } from '../components/AddFilterPopover'
import { MultiSelectFilter } from '../components/MultiSelectFilter'
import { SaveToListPanel } from '../components/SaveToListPanel'
import { exportTableToCSV } from '../lib/csvExport'
import { multiEqualsFilter } from '../lib/filters'
import { type CRMList, removeIdsFromList, listLayoutEqual, todayISO } from '../lib/lists'
import { toExternalUrl } from '../lib/url'

const ALL_COLUMNS: ColumnDefShort[] = [
  { id: 'Contact', label: 'Contact' },
  { id: 'Company', label: 'Company' },
  { id: 'company_groupe', label: 'Groupe' },
  { id: 'Job title', label: 'Job title' },
  { id: 'category', label: 'Category (auto)' },
  { id: 'funnel_stage', label: 'Funnel (cascaded)' },
  { id: 'Temperature', label: 'Temperature' },
  { id: 'employees', label: 'Employees (cascaded)' },
  { id: 'company_tagline', label: 'Company tagline' },
  { id: 'Calls count', label: 'Calls' },
  { id: 'Last contact', label: 'Last contact' },
  { id: 'Date added', label: 'Date added' },
  { id: 'Next action', label: 'Next action' },
  { id: 'Source', label: 'Source' },
  { id: 'links', label: 'Links' },
]

type SaveContact = (id: string, patch: Record<string, string>) => Promise<void>
type SaveCompany = (id: string, patch: Record<string, string>) => Promise<void>

function buildColumns(
  onOpenContact: (id: string) => void,
  onOpenCompany: (id: string) => void,
  saveContact: SaveContact,
  saveCompany: SaveCompany,
): ColumnDef<CRMRow>[] {
  return [
    {
      accessorKey: 'Contact',
      header: 'Contact',
      size: 170,
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenContact(row.original._id)
          }}
          className="block w-full text-left font-medium text-zinc-900 hover:underline"
        >
          {row.original.Contact}
        </button>
      ),
    },
    {
      accessorKey: 'Company',
      header: 'Company',
      size: 170,
      cell: ({ row }) => {
        const v = row.original.Company
        const cid = row.original._company_id
        if (!v) return <span className="block text-left text-zinc-400">—</span>
        if (!cid) return <span className="block text-left text-zinc-700">{v}</span>
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenCompany(cid)
            }}
            className="block w-full text-left text-zinc-700 hover:underline"
          >
            {v}
          </button>
        )
      },
    },
    {
      id: 'company_groupe',
      accessorFn: (r) => r._company?.Groupe ?? '',
      header: 'Groupe',
      size: 160,
      cell: ({ getValue }) => {
        const v = (getValue() as string) || ''
        return <span className="text-left text-zinc-700">{v || <span className="text-zinc-400">—</span>}</span>
      },
      filterFn: multiEqualsFilter,
    },
    {
      accessorKey: 'Job title',
      header: 'Job title',
      size: 200,
      cell: ({ getValue }) => {
        const v = (getValue() as string) || ''
        return <span className="line-clamp-3 break-words text-left text-zinc-600" title={v}>{v || '—'}</span>
      },
    },
    {
      id: 'category',
      header: 'Category',
      size: 130,
      accessorFn: (r) => categorizeJob(r['Job title'], r.Summary),
      cell: ({ getValue }) => {
        const v = getValue() as ReturnType<typeof categorizeJob>
        return <Badge className={categoryColors[v]}>{v}</Badge>
      },
      filterFn: multiEqualsFilter,
    },
    {
      id: 'employees',
      accessorFn: (r) => r._company?.employees ?? '',
      header: 'Employees',
      size: 100,
      cell: ({ row }) => {
        const co = row.original._company
        if (!co) return <span className="text-zinc-400">—</span>
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <InlineText
              value={co.employees}
              onSave={(v) => saveCompany(co.id, { employees: v })}
              placeholder="—"
            />
          </span>
        )
      },
      filterFn: multiEqualsFilter,
    },
    {
      id: 'company_tagline',
      accessorFn: (r) => r._company?.tagline ?? '',
      header: 'Company tagline',
      size: 240,
      cell: ({ row }) => {
        const co = row.original._company
        if (!co) return <span className="text-zinc-400">—</span>
        return (
          <span onClick={(e) => e.stopPropagation()} className="block max-w-[240px]">
            <InlineText
              value={co.tagline}
              onSave={(v) => saveCompany(co.id, { tagline: v })}
              placeholder="—"
            />
          </span>
        )
      },
      filterFn: multiEqualsFilter,
    },
    {
      id: 'funnel_stage',
      accessorFn: (r) => r._effective_funnel_stage,
      header: 'Funnel',
      size: 130,
      cell: ({ row }) => {
        const r = row.original
        const co = r._company
        const inherited = !!co?.funnel_stage
        const value = inherited ? co!.funnel_stage : r._funnel_stage
        const onSave = inherited && co
          ? (v: string) => saveCompany(co.id, { funnel_stage: v })
          : (v: string) => saveContact(r._id, { funnel_stage: v })
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <InlineSelect
              value={value}
              options={FUNNEL_STAGE_OPTIONS}
              onSave={onSave}
              render={(v) => (
                <Badge className={funnelStageColors[v]}>
                  {v}
                  {inherited && <span className="ml-1 text-[9px] font-normal opacity-60">(company)</span>}
                </Badge>
              )}
              placeholder="—"
            />
          </span>
        )
      },
      filterFn: multiEqualsFilter,
    },
    {
      accessorKey: 'Temperature',
      header: 'Temp.',
      size: 100,
      cell: ({ row }) => {
        const manual = row.original.Temperature
        const suggested = row.original._suggested_temperature
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <InlineSelect
              value={manual}
              options={TEMPERATURE_OPTIONS}
              onSave={(v) => saveContact(row.original._id, { temperature: v })}
              render={(v) => <Badge className={tempColors[v]}>{v}</Badge>}
              renderEmpty={() =>
                suggested ? (
                  <Badge className={tempColors[suggested]}>
                    {suggested}
                    <span className="ml-1 font-normal opacity-50">·auto</span>
                  </Badge>
                ) : (
                  <Badge>—</Badge>
                )
              }
            />
          </span>
        )
      },
      filterFn: multiEqualsFilter,
    },
    {
      accessorKey: 'Calls count',
      header: 'Calls',
      size: 90,
      sortingFn: (a, b, id) => Number(a.getValue(id)) - Number(b.getValue(id)),
    },
    {
      accessorKey: 'Last contact',
      header: 'Last contact',
      size: 130,
    },
    {
      accessorKey: 'Date added',
      header: 'Added',
      size: 110,
    },
    {
      accessorKey: 'Next action',
      header: 'Next action',
      size: 240,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()} className="block max-w-[240px]">
          <InlineText
            value={row.original['Next action']}
            onSave={(v) => saveContact(row.original._id, { next_action: v })}
            placeholder="—"
          />
        </span>
      ),
      filterFn: multiEqualsFilter,
    },
    {
      accessorKey: 'Source',
      header: 'Source',
      size: 130,
      filterFn: multiEqualsFilter,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <InlineSelect
            value={row.original.Source}
            options={SOURCE_OPTIONS}
            onSave={(v) => saveContact(row.original._id, { source: v })}
            placeholder="—"
          />
        </span>
      ),
    },
    {
      id: 'links',
      header: 'Links',
      size: 100,
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.LinkedIn && (
            <a
              href={toExternalUrl(row.original.LinkedIn)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200"
            >
              in
            </a>
          )}
          {row.original.Website && (
            <a
              href={toExternalUrl(row.original.Website)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200"
            >
              site
            </a>
          )}
        </div>
      ),
      enableSorting: false,
    },
  ]
}

export function TableView({
  data,
  onOpenContact,
  onOpenCompany,
  onRefresh,
  views,
  activeViewId,
  onActiveViewChange,
  onSaveViews,
  lists,
  onSaveLists,
  activeListId,
  activeList,
}: {
  data: CRMRow[]
  onOpenContact: (id: string) => void
  onOpenCompany: (id: string) => void
  onRefresh: () => Promise<void>
  views: View[]
  activeViewId: string
  onActiveViewChange: (id: string) => void
  onSaveViews: (updated: View[]) => Promise<void>
  lists: CRMList[]
  onSaveLists: (next: CRMList[]) => Promise<void>
  activeListId?: string
  activeList?: CRMList
}) {
  const listMode = !!activeListId
  const activeView = useMemo(
    () => views.find((v) => v.id === activeViewId) ?? views[0],
    [views, activeViewId],
  )
  const initLayout: { columns?: string[]; sort?: SortRule[]; filters?: FilterRule[] } = listMode
    ? { columns: activeList?.columns, sort: activeList?.sort, filters: activeList?.filters }
    : { columns: activeView?.columns, sort: activeView?.sort, filters: activeView?.filters }

  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>(initLayout.sort ?? [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initLayout.filters ?? [],
  )
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    initLayout.columns ?? ALL_COLUMNS.map((c) => c.id),
  )
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const v: VisibilityState = {}
    const visible = new Set(initLayout.columns ?? ALL_COLUMNS.map((c) => c.id))
    for (const c of ALL_COLUMNS) v[c.id] = visible.has(c.id)
    return v
  })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => {
    try {
      const raw = localStorage.getItem('crm-column-sizing-contacts')
      return raw ? (JSON.parse(raw) as ColumnSizingState) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('crm-column-sizing-contacts', JSON.stringify(columnSizing))
    } catch {
      /* ignore */
    }
  }, [columnSizing])

  useEffect(() => {
    if (listMode) return
    if (!activeView) return
    setSorting(activeView.sort)
    setColumnFilters(activeView.filters)
    setColumnOrder([
      ...activeView.columns,
      ...ALL_COLUMNS.map((c) => c.id).filter((id) => !activeView.columns.includes(id)),
    ])
    const v: VisibilityState = {}
    const visible = new Set(activeView.columns)
    for (const c of ALL_COLUMNS) v[c.id] = visible.has(c.id)
    setColumnVisibility(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId])

  useEffect(() => {
    if (!listMode || !activeList) return
    const cols = activeList.columns ?? ALL_COLUMNS.map((c) => c.id)
    setSorting(activeList.sort ?? [])
    setColumnFilters(activeList.filters ?? [])
    setColumnOrder([
      ...cols,
      ...ALL_COLUMNS.map((c) => c.id).filter((id) => !cols.includes(id)),
    ])
    const v: VisibilityState = {}
    const visible = new Set(cols)
    for (const c of ALL_COLUMNS) v[c.id] = visible.has(c.id)
    setColumnVisibility(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListId])

  const currentColumns = useMemo(
    () => columnOrder.filter((id) => columnVisibility[id] !== false),
    [columnOrder, columnVisibility],
  )

  const currentView: View | null = useMemo(() => {
    if (!activeView) return null
    return {
      ...activeView,
      columns: currentColumns,
      sort: sorting,
      filters: columnFilters as FilterRule[],
    }
  }, [activeView, currentColumns, sorting, columnFilters])

  const isDirty = !!activeView && !!currentView && !viewsEqual(activeView, currentView)

  const isDirtyList = useMemo(() => {
    if (!listMode || !activeList) return false
    const saved = {
      columns: activeList.columns ?? ALL_COLUMNS.map((c) => c.id),
      sort: activeList.sort ?? [],
      filters: activeList.filters ?? [],
    }
    const current = {
      columns: currentColumns,
      sort: sorting,
      filters: columnFilters as FilterRule[],
    }
    return !listLayoutEqual(saved, current)
  }, [listMode, activeList, currentColumns, sorting, columnFilters])

  const saveListLayout = async () => {
    if (!activeList) return
    const updated: CRMList = {
      ...activeList,
      columns: currentColumns,
      sort: sorting,
      filters: columnFilters as FilterRule[],
      updated_at: todayISO(),
    }
    const next = lists.map((l) => (l.id === activeList.id ? updated : l))
    await onSaveLists(next)
  }

  const handleSaveCurrentView = async () => {
    if (!currentView || !activeView) return
    const updated = views.map((v) => (v.id === activeView.id ? currentView : v))
    await onSaveViews(updated)
  }

  const handleCreateView = (name: string) => {
    if (!currentView) return
    const id = uniqueViewId(views, slugifyName(name) || 'view')
    const newView: View = { ...currentView, id, name }
    const updated = [...views, newView]
    onActiveViewChange(id)
    void onSaveViews(updated)
  }

  const handleRenameView = (id: string, name: string) => {
    const updated = views.map((v) => (v.id === id ? { ...v, name } : v))
    void onSaveViews(updated)
  }

  const handleDeleteView = (id: string) => {
    const updated = views.filter((v) => v.id !== id)
    if (id === activeViewId && updated.length > 0) onActiveViewChange(updated[0].id)
    void onSaveViews(updated)
  }

  const saveContact = useMemo(
    () => async (id: string, patch: Record<string, string>) => {
      await savePatch('contacts', id, patch)
      await onRefresh()
    },
    [onRefresh],
  )

  const saveCompany = useMemo(
    () => async (id: string, patch: Record<string, string>) => {
      await savePatch('companies', id, patch)
      await onRefresh()
    },
    [onRefresh],
  )

  const columns = useMemo(
    () => buildColumns(onOpenContact, onOpenCompany, saveContact, saveCompany),
    [onOpenContact, onOpenCompany, saveContact, saveCompany],
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      columnOrder,
      columnSizing,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 60, size: 140 },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _id, value) => {
      const v = String(value).toLowerCase()
      return Object.values(row.original).some((x) =>
        String(x ?? '').toLowerCase().includes(v),
      )
    },
  })

  const filteredCount = table.getFilteredRowModel().rows.length
  const visibleColCount = table.getVisibleLeafColumns().length + 1

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeListId, activeViewId])

  const visibleRowIds = useMemo(
    () => table.getFilteredRowModel().rows.map((r) => r.original._id),
    [table, columnFilters, globalFilter, data],
  )
  const allVisibleSelected = visibleRowIds.length > 0 && visibleRowIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = !allVisibleSelected && visibleRowIds.some((id) => selectedIds.has(id))

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const id of visibleRowIds) next.delete(id)
      } else {
        for (const id of visibleRowIds) next.add(id)
      }
      return next
    })
  }
  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const removeSelectedFromActiveList = async () => {
    if (!activeListId) return
    const target = lists.find((l) => l.id === activeListId)
    if (!target) return
    const updated = removeIdsFromList(target, [...selectedIds])
    if (updated === target) return
    const next = lists.map((l) => (l.id === activeListId ? updated : l))
    await onSaveLists(next)
    setSelectedIds(new Set())
  }

  const setFilter = (id: string, value: string | string[]) => {
    setColumnFilters((prev) => {
      const others = prev.filter((f) => f.id !== id)
      const isEmpty = Array.isArray(value) ? value.length === 0 : !value
      return isEmpty ? others : [...others, { id, value }]
    })
  }
  const getFilter = (id: string): string | string[] | undefined => {
    const v = columnFilters.find((f) => f.id === id)?.value
    return v as string | string[] | undefined
  }

  const uniqueValues = (id: keyof CRMRow): string[] => {
    const set = new Set<string>()
    data.forEach((r) => {
      const v = r[id]
      if (typeof v === 'string' && v) set.add(v)
    })
    return Array.from(set).sort()
  }

  const uniqueCategories = (): string[] => {
    const set = new Set<string>()
    data.forEach((r) => set.add(categorizeJob(r['Job title'], r.Summary)))
    return Array.from(set).sort()
  }

  return (
    <div className="space-y-3">
      {!listMode && (
        <ViewsBar
          views={views}
          activeViewId={activeViewId}
          onSelect={onActiveViewChange}
          onCreate={handleCreateView}
          onRename={handleRenameView}
          onDelete={handleDeleteView}
          onSave={handleSaveCurrentView}
          isDirty={isDirty}
        />
      )}

      {listMode && isDirtyList && (
        <div className="flex items-center justify-end rounded-lg border border-zinc-200 bg-white p-2">
          <button
            onClick={() => void saveListLayout()}
            className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800"
          >
            ● Save list layout
          </button>
        </div>
      )}

      <div className="relative flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3">
        <input
          type="search"
          placeholder="Search (contact, company, job title, summary…)"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="min-w-72 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
        />
        <MultiSelectFilter
          label="Category"
          options={uniqueCategories()}
          value={getFilter('category')}
          onChange={(arr) => setFilter('category', arr)}
        />
        <MultiSelectFilter
          label="Funnel"
          options={FUNNEL_STAGE_OPTIONS}
          value={getFilter('funnel_stage')}
          onChange={(arr) => setFilter('funnel_stage', arr)}
        />
        <MultiSelectFilter
          label="Temperature"
          options={['Hot', 'Warm', 'Cold']}
          value={getFilter('Temperature')}
          onChange={(arr) => setFilter('Temperature', arr)}
        />
        <MultiSelectFilter
          label="Source"
          options={uniqueValues('Source')}
          value={getFilter('Source')}
          onChange={(arr) => setFilter('Source', arr)}
        />
        <AddFilterPopover
          columns={ALL_COLUMNS.filter((c) => c.id !== 'links')}
          data={data}
          getCellValue={getCRMRowValue}
          onAdd={(id, value) => setFilter(id, value)}
        />
        {(globalFilter || columnFilters.length > 0) && (
          <button
            onClick={() => {
              setGlobalFilter('')
              setColumnFilters([])
            }}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Reset
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setShowColumnConfig((v) => !v)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            ⚙ Columns
          </button>
          {showColumnConfig && (
            <ColumnConfig
              available={ALL_COLUMNS}
              visible={currentColumns}
              order={columnOrder}
              onChange={(newVisible, newOrder) => {
                setColumnOrder(newOrder)
                const v: VisibilityState = {}
                const visSet = new Set(newVisible)
                for (const c of ALL_COLUMNS) v[c.id] = visSet.has(c.id)
                setColumnVisibility(v)
              }}
              onClose={() => setShowColumnConfig(false)}
            />
          )}
        </div>
        <button
          onClick={() =>
            exportTableToCSV(table, { table: 'contacts', viewName: activeView?.name })
          }
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          title="Export current view (filters + sort + visible columns)"
        >
          ⬇ Export CSV
        </button>
        <span className="text-xs text-zinc-500">
          {filteredCount} result{filteredCount > 1 ? 's' : ''}
        </span>
      </div>

      {columnFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <span className="text-xs font-medium text-zinc-500">Active filters:</span>
          {columnFilters.map((f) => {
            const label = ALL_COLUMNS.find((c) => c.id === f.id)?.label ?? f.id
            const values = Array.isArray(f.value) ? f.value : [String(f.value)]
            const display =
              values.length === 1 ? values[0] : `${values.length} values (${values.join(', ')})`
            return (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-zinc-300"
              >
                <span className="font-medium text-zinc-700">{label}</span>
                <span className="text-zinc-500">{values.length > 1 ? 'in' : '='}</span>
                <span className="text-zinc-800">{display}</span>
                <button
                  onClick={() => setFilter(f.id, '')}
                  className="ml-0.5 text-zinc-400 hover:text-zinc-700"
                  aria-label="Remove this filter"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-900 px-3 py-2 text-white">
          <span className="text-xs font-medium">
            {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-zinc-300 underline hover:text-white"
          >
            Deselect
          </button>
          <div className="ml-auto flex items-center gap-2">
            <SaveToListPanel
              selectedIds={[...selectedIds]}
              lists={lists}
              onSaveLists={onSaveLists}
              onClearSelection={() => setSelectedIds(new Set())}
            />
            {activeListId && (
              <button
                onClick={() => void removeSelectedFromActiveList()}
                className="rounded-md border border-red-400 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20"
              >
                Remove from list
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table
            className="table-fixed text-sm"
            style={{ width: table.getTotalSize() + 40 }}
          >
            <thead className="bg-zinc-50 text-left">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-zinc-200">
                  <th
                    style={{ width: 40 }}
                    className="px-3 py-2.5 text-xs font-semibold text-zinc-500"
                  >
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected
                      }}
                      onChange={toggleAllVisible}
                      className="h-3.5 w-3.5 cursor-pointer accent-zinc-900"
                      aria-label="Select all"
                    />
                  </th>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      style={{ width: h.getSize() }}
                      className="group relative whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      {h.isPlaceholder ? null : (
                        <button
                          onClick={h.column.getToggleSortingHandler()}
                          className={
                            h.column.getCanSort()
                              ? 'flex items-center gap-1 hover:text-zinc-900'
                              : 'cursor-default'
                          }
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <span className="text-zinc-400">
                            {{ asc: '↑', desc: '↓' }[h.column.getIsSorted() as string] ?? ''}
                          </span>
                        </button>
                      )}
                      {!h.isPlaceholder && h.column.getCanResize() && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            h.getResizeHandler()(e)
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation()
                            h.getResizeHandler()(e)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-400 ${
                            h.column.getIsResizing() ? 'bg-zinc-600 opacity-100' : 'bg-zinc-300'
                          }`}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const rowId = row.original._id
                const isSelected = selectedIds.has(rowId)
                return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    className={`cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 ${
                      isSelected ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <td
                      style={{ width: 40 }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-2 align-top"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(rowId)}
                        className="h-3.5 w-3.5 cursor-pointer accent-zinc-900"
                        aria-label="Select this row"
                      />
                    </td>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="break-words px-3 py-2 align-top text-left"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expanded === row.id && (
                    <tr className="bg-zinc-50/60">
                      <td colSpan={visibleColCount} className="px-3 py-3">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="md:col-span-2">
                              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Summary (360 view)
                              </div>
                              <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                                {row.original.Summary || (
                                  <span className="italic text-zinc-400">No summary</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Next action
                              </div>
                              <div className="mt-1 text-sm text-zinc-700">
                                {row.original['Next action'] || (
                                  <span className="italic text-zinc-400">—</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {row.original._company?.notes && (
                            <div className="text-sm text-zinc-700">
                              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Company notes:{' '}
                              </span>
                              {row.original._company.notes}
                            </div>
                          )}

                          {row.original._calls.length > 0 && (
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Calls ({row.original._calls.length})
                              </div>
                              <div className="mt-2 space-y-2">
                                {row.original._calls.map((c) => (
                                  <div
                                    key={c.id}
                                    className="rounded-md border border-zinc-200 bg-white p-3"
                                  >
                                    <div className="flex items-baseline justify-between">
                                      <div className="text-xs font-medium text-zinc-700">
                                        {c.date} · {c.type}
                                      </div>
                                    </div>
                                    <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                                      {c.summary}
                                    </div>
                                    {c.next_action && (
                                      <div className="mt-2 text-xs text-zinc-500">
                                        → {c.next_action}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
                )
              })}
              {filteredCount === 0 && (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-3 py-12 text-center text-sm text-zinc-400"
                  >
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Maps a column id to its value in a CRMRow (for AddFilterPopover suggestions)
function getCRMRowValue(r: CRMRow, colId: string): unknown {
  if (colId in r) return (r as unknown as Record<string, unknown>)[colId]
  if (colId === 'employees') return r._company?.employees
  if (colId === 'company_groupe') return r._company?.Groupe
  if (colId === 'company_tagline') return r._company?.tagline
  if (colId === 'funnel_stage') return r._effective_funnel_stage
  return undefined
}
