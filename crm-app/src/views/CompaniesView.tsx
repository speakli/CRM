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
import type { Company, CRMRow } from '../parseTSV'
import {
  Badge,
  tempColors,
  funnelStageColors,
} from '../components/Badge'
import {
  InlineSelect,
  InlineText,
  savePatch,
} from '../components/InlineEdit'
import {
  FUNNEL_STAGE_OPTIONS,
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

type Row = {
  company: Company
  contactsCount: number
  callsCount: number
  hot: number
  warm: number
  cold: number
  contactsList: CRMRow[]
}

const ALL_COLUMNS: ColumnDefShort[] = [
  { id: 'name', label: 'Company' },
  { id: 'numero_finess', label: 'N° Finess' },
  { id: 'typologie', label: 'Typologie' },
  { id: 'type_etablissement', label: 'Type' },
  { id: 'groupe', label: 'Groupe' },
  { id: 'funnel_stage', label: 'Funnel' },
  { id: 'score_icp', label: 'Score ICP' },
  { id: 'uses_netsoins', label: 'NETSoins' },
  { id: 'dui', label: 'DUI' },
  { id: 'industry', label: 'Industry' },
  { id: 'tagline', label: 'Tagline' },
  { id: 'summary', label: 'Summary' },
  { id: 'next_action', label: 'Next action' },
  { id: 'contacts_count', label: 'Contacts' },
  { id: 'calls_count', label: 'Calls' },
  { id: 'temp_breakdown', label: 'Temp. (H/W/C)' },
  { id: 'phone', label: 'Téléphone' },
  { id: 'tel_clean', label: 'Tél. export' },
  { id: 'mail', label: 'Mail' },
  { id: 'website', label: 'Site' },
  { id: 'adresse', label: 'Adresse' },
  { id: 'code_postal', label: 'Code postal' },
  { id: 'ville', label: 'Ville' },
  { id: 'city', label: 'City' },
  { id: 'departement', label: 'Département' },
  { id: 'region', label: 'Région' },
  { id: 'country', label: 'Pays' },
  { id: 'total_lits', label: 'Total lits' },
  { id: 'estimation_lits', label: 'Estim. lits' },
  { id: 'chambres_simples', label: 'Ch. simples' },
  { id: 'chambres_doubles', label: 'Ch. doubles' },
  { id: 'place', label: 'Places' },
  { id: 'taille', label: 'Taille' },
  { id: 'employees', label: 'Employees' },
  { id: 'prix_min', label: 'Prix min' },
  { id: 'ca_hebergement', label: 'CA hébergement' },
  { id: 'pct_apa', label: '% APA' },
]

type SaveCompany = (id: string, patch: Record<string, string>) => Promise<void>

function buildColumns(
  onOpenCompany: (id: string) => void,
  saveCompany: SaveCompany,
): ColumnDef<Row>[] {
  return [
    {
      id: 'name',
      accessorFn: (r) => r.company.name,
      header: 'Company',
      size: 200,
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenCompany(row.original.company.id)
          }}
          className="font-medium text-zinc-900 hover:underline"
        >
          {row.original.company.name}
        </button>
      ),
    },
    {
      id: 'funnel_stage',
      accessorFn: (r) => r.company.funnel_stage,
      header: 'Funnel',
      size: 130,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <InlineSelect
            value={row.original.company.funnel_stage}
            options={FUNNEL_STAGE_OPTIONS}
            onSave={(v) => saveCompany(row.original.company.id, { funnel_stage: v })}
            render={(v) => <Badge className={funnelStageColors[v]}>{v}</Badge>}
            placeholder="—"
          />
        </span>
      ),
      filterFn: multiEqualsFilter,
    },
    {
      id: 'contacts_count',
      accessorFn: (r) => r.contactsCount,
      header: 'Contacts',
      size: 90,
      cell: ({ getValue }) => (
        <span className="tabular-nums text-zinc-700">{getValue() as number}</span>
      ),
      sortingFn: 'basic',
    },
    {
      id: 'calls_count',
      accessorFn: (r) => r.callsCount,
      header: 'Calls',
      size: 80,
      cell: ({ getValue }) => (
        <span className="tabular-nums text-zinc-600">{getValue() as number}</span>
      ),
      sortingFn: 'basic',
    },
    {
      id: 'temp_breakdown',
      header: 'Temp. (H/W/C)',
      size: 130,
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex gap-1">
            {r.hot > 0 && <Badge className={tempColors.Chaud}>{r.hot}C</Badge>}
            {r.warm > 0 && <Badge className={tempColors.Tiède}>{r.warm}T</Badge>}
            {r.cold > 0 && <Badge className={tempColors.Froid}>{r.cold}F</Badge>}
            {r.hot === 0 && r.warm === 0 && r.cold === 0 && (
              <span className="text-xs text-zinc-400">—</span>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: 'employees',
      accessorFn: (r) => r.company.employees,
      header: 'Employees',
      size: 110,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <InlineText
            value={row.original.company.employees}
            onSave={(v) => saveCompany(row.original.company.id, { employees: v })}
            placeholder="—"
          />
        </span>
      ),
      filterFn: multiEqualsFilter,
    },
    {
      id: 'tagline',
      accessorFn: (r) => r.company.tagline,
      header: 'Tagline',
      size: 260,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()} className="block break-words">
          <InlineText
            value={row.original.company.tagline}
            onSave={(v) => saveCompany(row.original.company.id, { tagline: v })}
            placeholder="—"
          />
        </span>
      ),
    },
    {
      id: 'next_action',
      accessorFn: (r) => r.company.next_action,
      header: 'Next action',
      size: 240,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()} className="block break-words">
          <InlineText
            value={row.original.company.next_action}
            onSave={(v) => saveCompany(row.original.company.id, { next_action: v })}
            placeholder="—"
          />
        </span>
      ),
    },
    {
      id: 'summary',
      accessorFn: (r) => r.company.summary,
      header: 'Summary',
      size: 280,
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()} className="block max-w-[280px]">
          <InlineText
            value={row.original.company.summary}
            onSave={(v) => saveCompany(row.original.company.id, { summary: v })}
            placeholder="—"
          />
        </span>
      ),
      filterFn: multiEqualsFilter,
    },
    {
      id: 'dui',
      accessorFn: (r) => r.company.DUI,
      header: 'DUI',
      size: 120,
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>
      ),
      filterFn: multiEqualsFilter,
    },
    {
      id: 'numero_finess',
      accessorFn: (r) => r.company['Numéro Finess'] ?? '',
      header: 'N° Finess',
      size: 110,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
    },
    {
      id: 'typologie',
      accessorFn: (r) => r.company['Typologie'] ?? '',
      header: 'Typologie',
      size: 100,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
      filterFn: multiEqualsFilter,
    },
    {
      id: 'groupe',
      accessorFn: (r) => r.company['Groupe'] ?? '',
      header: 'Groupe',
      size: 160,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
      filterFn: multiEqualsFilter,
    },
    {
      id: 'mail',
      accessorFn: (r) => r.company['Mail'] ?? '',
      header: 'Mail',
      size: 180,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
    },
    {
      id: 'tel_clean',
      accessorFn: (r) => r.company['Téléphones Clean Export'] ?? '',
      header: 'Tél.',
      size: 130,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
    },
    {
      id: 'adresse',
      accessorFn: (r) => r.company['Adresse'] ?? '',
      header: 'Adresse',
      size: 200,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
    },
    {
      id: 'code_postal',
      accessorFn: (r) => r.company['Code postal'] ?? '',
      header: 'CP',
      size: 80,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
      filterFn: multiEqualsFilter,
    },
    {
      id: 'ville',
      accessorFn: (r) => r.company['Ville'] ?? '',
      header: 'Ville',
      size: 130,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
      filterFn: multiEqualsFilter,
    },
    {
      id: 'departement',
      accessorFn: (r) => r.company['Département'] ?? '',
      header: 'Département',
      size: 120,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
      filterFn: multiEqualsFilter,
    },
    {
      id: 'total_lits',
      accessorFn: (r) => r.company['Total de lits'] ?? '',
      header: 'Total lits',
      size: 90,
      cell: ({ getValue }) => <span className="tabular-nums text-zinc-700">{(getValue() as string) || '—'}</span>,
    },
    {
      id: 'taille',
      accessorFn: (r) => r.company["Taille d'établissement"] ?? '',
      header: 'Taille',
      size: 130,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
      filterFn: multiEqualsFilter,
    },
    {
      id: 'prix_min',
      accessorFn: (r) => r.company['Prix minimum mensuel'] ?? '',
      header: 'Prix min',
      size: 110,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
    },
    {
      id: 'pct_apa',
      accessorFn: (r) => r.company['% Places APA'] ?? '',
      header: '% APA',
      size: 90,
      cell: ({ getValue }) => <span className="text-sm text-zinc-700">{(getValue() as string) || '—'}</span>,
    },
  ]
}

export function CompaniesView({
  companies,
  contacts,
  onOpenCompany,
  onOpenContact,
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
  companies: Company[]
  contacts: CRMRow[]
  onOpenCompany: (id: string) => void
  onOpenContact: (id: string) => void
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
  const rows: Row[] = useMemo(() => {
    return companies.map((co) => {
      const myContacts = contacts.filter((c) => c._company_id === co.id)
      const callsCount = myContacts.reduce((acc, c) => acc + c._calls.length, 0)
      const hot = myContacts.filter((c) => c.Temperature === 'Chaud').length
      const warm = myContacts.filter((c) => c.Temperature === 'Tiède').length
      const cold = myContacts.filter((c) => c.Temperature === 'Froid').length
      return {
        company: co,
        contactsCount: myContacts.length,
        callsCount,
        hot,
        warm,
        cold,
        contactsList: myContacts,
      }
    })
  }, [companies, contacts])

  const orphanContacts = useMemo(
    () => contacts.filter((c) => !c._company_id),
    [contacts],
  )

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
      const raw = localStorage.getItem('crm-column-sizing-companies')
      return raw ? (JSON.parse(raw) as ColumnSizingState) : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('crm-column-sizing-companies', JSON.stringify(columnSizing))
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

  const saveCompany = useMemo(
    () => async (id: string, patch: Record<string, string>) => {
      await savePatch('companies', id, patch)
      await onRefresh()
    },
    [onRefresh],
  )

  const columns = useMemo(
    () => buildColumns(onOpenCompany, saveCompany),
    [onOpenCompany, saveCompany],
  )

  const table = useReactTable({
    data: rows,
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
      const co = row.original.company
      const blob = `${co.name} ${co.DUI} ${co.summary} ${co.notes} ${row.original.contactsList.map((c) => c.Contact).join(' ')}`.toLowerCase()
      return blob.includes(v)
    },
  })

  const filteredCount = table.getFilteredRowModel().rows.length
  const visibleColCount = table.getVisibleLeafColumns().length + 1

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeListId, activeViewId])

  const visibleRowIds = useMemo(
    () => table.getFilteredRowModel().rows.map((r) => r.original.company.id),
    [table, columnFilters, globalFilter, rows],
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
          placeholder="Search a company or contact…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="min-w-72 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
        />
        <MultiSelectFilter
          label="Funnel"
          options={FUNNEL_STAGE_OPTIONS}
          value={getFilter('funnel_stage')}
          onChange={(arr) => setFilter('funnel_stage', arr)}
        />

        <AddFilterPopover
          columns={ALL_COLUMNS.filter((c) => c.id !== 'temp_breakdown' && c.id !== 'contacts_count' && c.id !== 'calls_count')}
          data={rows}
          getCellValue={getCompanyRowValue}
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
            exportTableToCSV(table, { table: 'companies', viewName: activeView?.name })
          }
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          title="Export current view (filters + sort + visible columns)"
        >
          ⬇ Export CSV
        </button>
        <span className="text-xs text-zinc-500">
          {filteredCount} compan{filteredCount > 1 ? 'ies' : 'y'} ·{' '}
          {orphanContacts.length} without company
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
            {selectedIds.size} compan{selectedIds.size > 1 ? 'ies' : 'y'} selected
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
                const rowId = row.original.company.id
                const isSelected = selectedIds.has(rowId)
                return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() =>
                      setExpanded(
                        expanded === row.original.company.id
                          ? null
                          : row.original.company.id,
                      )
                    }
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
                        aria-label="Select this company"
                      />
                    </td>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="break-words px-3 py-2 align-top"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expanded === row.original.company.id && (
                    <tr className="bg-zinc-50/60">
                      <td colSpan={visibleColCount} className="px-3 py-3">
                        <div className="space-y-2 mb-3">
                          {row.original.company.summary && (
                            <div className="text-sm text-zinc-700">
                              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Summary:{' '}
                              </span>
                              {row.original.company.summary}
                            </div>
                          )}
                          {row.original.company.notes && (
                            <div className="text-sm text-zinc-700">
                              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Notes:{' '}
                              </span>
                              {row.original.company.notes}
                            </div>
                          )}
                          {row.original.company.next_action && (
                            <div className="text-sm text-zinc-700">
                              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                Next action:{' '}
                              </span>
                              {row.original.company.next_action}
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {row.original.contactsList.map((c) => {
                            const lastCall = c._calls.length > 0 ? c._calls[c._calls.length - 1] : null
                            return (
                              <div
                                key={c._id}
                                className="rounded-md border border-zinc-200 bg-white p-3"
                              >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-zinc-900">
                                      <button
                                        onClick={() => onOpenContact(c._id)}
                                        className="hover:underline"
                                      >
                                        {c.Contact}
                                      </button>
                                      <span className="ml-2 text-xs font-normal text-zinc-500">
                                        {c['Job title'] || '—'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    {c.Temperature ? (
                                      <Badge className={tempColors[c.Temperature]}>
                                        {c.Temperature}
                                      </Badge>
                                    ) : c._suggested_temperature ? (
                                      <Badge className={tempColors[c._suggested_temperature]}>
                                        {c._suggested_temperature}
                                        <span className="ml-1 font-normal opacity-50">·auto</span>
                                      </Badge>
                                    ) : (
                                      <Badge>—</Badge>
                                    )}
                                  </div>
                                </div>
                                {c.Summary && (
                                  <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
                                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                      Contact summary:{' '}
                                    </span>
                                    {c.Summary}
                                  </div>
                                )}
                                {lastCall && (
                                  <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
                                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                      Last call ({lastCall.date}
                                      {lastCall.type ? ` · ${lastCall.type}` : ''}):{' '}
                                    </span>
                                    {lastCall.summary}
                                  </div>
                                )}
                                {c['Next action'] && (
                                  <div className="mt-2 text-sm text-zinc-600">
                                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                      Contact next action:{' '}
                                    </span>
                                    {c['Next action']}
                                  </div>
                                )}
                              </div>
                            )
                          })}
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
                    No companies
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {orphanContacts.length > 0 && !globalFilter && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Contacts without company ({orphanContacts.length})
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
            {orphanContacts.map((c) => (
              <button
                key={c._id}
                onClick={() => onOpenContact(c._id)}
                className="flex items-center justify-between rounded border border-zinc-100 px-2 py-1 text-xs hover:bg-zinc-50"
              >
                <span className="truncate text-zinc-700">{c.Contact}</span>
                <span className="ml-2 truncate text-zinc-400">{c['Job title']}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Maps a column id to its value in a Row (for AddFilterPopover suggestions)
function getCompanyRowValue(r: Row, colId: string): unknown {
  if (colId === 'contacts_count') return r.contactsCount
  if (colId === 'calls_count') return r.callsCount
  const co = r.company as unknown as Record<string, unknown>
  return co[colId]
}
