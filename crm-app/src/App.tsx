import { useEffect, useMemo, useRef, useState } from 'react'
import {
  parseCompanies,
  parseContacts,
  parseCalls,
  joinData,
  type CRMRow,
  type Company,
  type Contact,
  type Call,
} from './parseTSV'
import { TableView } from './views/TableView'
import { DashboardView } from './views/DashboardView'
import { CompaniesView } from './views/CompaniesView'
import { CallsView } from './views/CallsView'
import { CompanyDetailView } from './views/CompanyDetailView'
import { ContactDetailView } from './views/ContactDetailView'
import { PropertiesView } from './views/PropertiesView'
import { ListsView } from './views/ListsView'
import {
  fetchViews,
  saveViews,
  type ViewsConfig,
  type View as SavedView,
} from './lib/views'
import {
  fetchLists,
  saveLists,
  type ListsConfig,
  type ListTable,
} from './lib/lists'
import { fetchAudit, type AuditFile } from './lib/audit'
import { ChatAssistant } from './components/ChatAssistant'
import type { ActiveContext } from './lib/chatContext'

type Tab = 'dashboard' | 'contacts' | 'companies' | 'calls' | 'properties' | 'lists'
type View =
  | { kind: 'tab'; tab: Tab }
  | { kind: 'company'; id: string }
  | { kind: 'contact'; id: string }
  | { kind: 'list'; table: ListTable; id: string }

async function fetchAll(): Promise<{
  rows: CRMRow[]
  companies: Company[]
  contacts: Contact[]
  calls: Call[]
}> {
  const [c, ct, ca] = await Promise.all([
    fetch('/api/companies', { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error(`companies: HTTP ${r.status}`)
      return r.text()
    }),
    fetch('/api/contacts', { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error(`contacts: HTTP ${r.status}`)
      return r.text()
    }),
    fetch('/api/calls', { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error(`calls: HTTP ${r.status}`)
      return r.text()
    }),
  ])
  const companies = parseCompanies(c)
  const contacts = parseContacts(ct)
  const calls = parseCalls(ca)
  return { rows: joinData(companies, contacts, calls), companies, contacts, calls }
}

export function App() {
  const [rows, setRows] = useState<CRMRow[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>({ kind: 'tab', tab: 'dashboard' })
  const [viewsConfig, setViewsConfig] = useState<ViewsConfig>({
    contacts: [],
    companies: [],
  })
  const [activeContactView, setActiveContactView] = useState<string>('default')
  const [activeCompanyView, setActiveCompanyView] = useState<string>('default')
  const [audit, setAudit] = useState<AuditFile | null>(null)
  const [listsConfig, setListsConfig] = useState<ListsConfig>({ contacts: [], companies: [] })
  const [crmRules, setCrmRules] = useState<string>('')
  const [icpRules, setIcpRules] = useState<string>('')
  const viewsConfigRef = useRef(viewsConfig)
  viewsConfigRef.current = viewsConfig
  const listsConfigRef = useRef(listsConfig)
  listsConfigRef.current = listsConfig

  const refresh = async () => {
    try {
      setError(null)
      const [allData, auditData] = await Promise.all([fetchAll(), fetchAudit()])
      setRows(allData.rows)
      setCompanies(allData.companies)
      setContacts(allData.contacts)
      setCalls(allData.calls)
      setAudit(auditData)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    void fetchViews()
      .then((cfg) => {
        setViewsConfig(cfg)
        if (cfg.contacts.length > 0) setActiveContactView(cfg.contacts[0].id)
        if (cfg.companies.length > 0) setActiveCompanyView(cfg.companies[0].id)
      })
      .catch((e) => setError(`Views: ${(e as Error).message}`))
    void fetchLists()
      .then((cfg) => setListsConfig(cfg))
      .catch((e) => setError(`Lists: ${(e as Error).message}`))
    void fetch('/api/docs/crm-rules', { cache: 'no-store' })
      .then((r) => r.text())
      .then(setCrmRules)
      .catch(() => {})
    void fetch('/api/docs/icp', { cache: 'no-store' })
      .then((r) => r.text())
      .then(setIcpRules)
      .catch(() => {})
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const persistContactsViews = async (vs: SavedView[]) => {
    const newConfig = { ...viewsConfigRef.current, contacts: vs }
    viewsConfigRef.current = newConfig
    setViewsConfig(newConfig)
    await saveViews(newConfig)
  }
  const persistCompaniesViews = async (vs: SavedView[]) => {
    const newConfig = { ...viewsConfigRef.current, companies: vs }
    viewsConfigRef.current = newConfig
    setViewsConfig(newConfig)
    await saveViews(newConfig)
  }

  const persistLists = async (next: ListsConfig) => {
    listsConfigRef.current = next
    setListsConfig(next)
    await saveLists(next)
  }

  const companyById = useMemo(
    () => new Map(companies.map((c) => [c.id, c])),
    [companies],
  )
  const contactById = useMemo(() => new Map(rows.map((c) => [c._id, c])), [rows])

  const activeContext: ActiveContext = useMemo(() => {
    if (view.kind === 'company') {
      const co = companyById.get(view.id)
      return co ? { kind: 'company', company: co } : null
    }
    if (view.kind === 'contact') {
      const ct = contactById.get(view.id)
      return ct ? { kind: 'contact', contact: ct } : null
    }
    return null
  }, [view, companyById, contactById])

  const openCompany = (id: string) => setView({ kind: 'company', id })
  const openContact = (id: string) => setView({ kind: 'contact', id })
  const openList = (table: ListTable, id: string) => setView({ kind: 'list', table, id })
  const goTab = (tab: Tab) => setView({ kind: 'tab', tab })
  const back = () => setView({ kind: 'tab', tab: 'dashboard' })

  const currentTab = view.kind === 'tab' ? view.tab : view.kind === 'list' ? 'lists' : null

  const activeList = view.kind === 'list'
    ? (view.table === 'contacts' ? listsConfig.contacts : listsConfig.companies).find((l) => l.id === view.id)
    : null
  const listFilteredRows = view.kind === 'list' && view.table === 'contacts' && activeList
    ? rows.filter((r) => activeList.ids.includes(r._id))
    : rows
  const listFilteredCompanies = view.kind === 'list' && view.table === 'companies' && activeList
    ? companies.filter((c) => activeList.ids.includes(c.id))
    : companies

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1700px] px-6 py-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
              <button
                onClick={() => goTab('dashboard')}
                className="text-xl font-semibold tracking-tight hover:text-zinc-700"
              >
                CRM
              </button>
              <span className="text-xs text-zinc-400">local viewer</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <span>
                {rows.length} contacts · {companies.length} companies · {calls.length} calls
              </span>
              <button
                onClick={() => void refresh()}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
          <nav className="mt-3 flex gap-1">
            <TabButton active={currentTab === 'dashboard'} onClick={() => goTab('dashboard')}>
              Dashboard
            </TabButton>
            <TabButton active={currentTab === 'contacts'} onClick={() => goTab('contacts')}>
              Contacts
            </TabButton>
            <TabButton active={currentTab === 'companies'} onClick={() => goTab('companies')}>
              Companies
            </TabButton>
            <TabButton active={currentTab === 'calls'} onClick={() => goTab('calls')}>
              Calls
            </TabButton>
            <TabButton active={currentTab === 'lists'} onClick={() => goTab('lists')}>
              Lists
            </TabButton>
            <TabButton
              active={currentTab === 'properties'}
              onClick={() => goTab('properties')}
            >
              Properties
            </TabButton>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>TSV read error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
            Loading…
          </div>
        ) : view.kind === 'company' ? (
          (() => {
            const co = companyById.get(view.id)
            if (!co) {
              return (
                <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
                  Company not found
                  <button onClick={back} className="ml-2 underline">
                    back
                  </button>
                </div>
              )
            }
            return (
              <CompanyDetailView
                company={co}
                contacts={rows}
                onBack={() => goTab('companies')}
                onOpenContact={openContact}
                onRefresh={refresh}
                audit={audit}
              />
            )
          })()
        ) : view.kind === 'contact' ? (
          (() => {
            const ct = contactById.get(view.id)
            if (!ct) {
              return (
                <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
                  Contact not found
                  <button onClick={back} className="ml-2 underline">
                    back
                  </button>
                </div>
              )
            }
            return (
              <ContactDetailView
                contact={ct}
                contacts={rows}
                onBack={() => goTab('contacts')}
                onOpenCompany={openCompany}
                onOpenContact={openContact}
                onRefresh={refresh}
                audit={audit}
              />
            )
          })()
        ) : view.kind === 'list' ? (
          (() => {
            if (!activeList) {
              return (
                <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
                  List not found
                  <button onClick={() => goTab('lists')} className="ml-2 underline">
                    back to lists
                  </button>
                </div>
              )
            }
            const breadcrumb = (
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                <div className="flex items-center gap-2">
                  <button onClick={() => goTab('lists')} className="text-zinc-500 hover:text-zinc-900">
                    ← Lists
                  </button>
                  <span className="text-zinc-300">/</span>
                  <span className="font-medium text-zinc-900">{activeList.name}</span>
                  <span className="text-xs text-zinc-500">
                    ({view.table === 'contacts' ? listFilteredRows.length : listFilteredCompanies.length}
                    {view.table === 'contacts' ? ' contacts' : ' companies'})
                  </span>
                </div>
              </div>
            )
            if (view.table === 'contacts') {
              return (
                <div className="space-y-3">
                  {breadcrumb}
                  <TableView
                    data={listFilteredRows}
                    onOpenContact={openContact}
                    onOpenCompany={openCompany}
                    onRefresh={refresh}
                    views={viewsConfig.contacts}
                    activeViewId={activeContactView}
                    onActiveViewChange={setActiveContactView}
                    onSaveViews={persistContactsViews}
                    lists={listsConfig.contacts}
                    onSaveLists={async (next) => persistLists({ ...listsConfig, contacts: next })}
                    activeListId={activeList.id}
                    activeList={activeList}
                  />
                </div>
              )
            }
            return (
              <div className="space-y-3">
                {breadcrumb}
                <CompaniesView
                  companies={listFilteredCompanies}
                  contacts={rows}
                  onOpenCompany={openCompany}
                  onOpenContact={openContact}
                  onRefresh={refresh}
                  views={viewsConfig.companies}
                  activeViewId={activeCompanyView}
                  onActiveViewChange={setActiveCompanyView}
                  onSaveViews={persistCompaniesViews}
                  lists={listsConfig.companies}
                  onSaveLists={async (next) => persistLists({ ...listsConfig, companies: next })}
                  activeListId={activeList.id}
                  activeList={activeList}
                />
              </div>
            )
          })()
        ) : view.tab === 'dashboard' ? (
          <DashboardView data={rows} />
        ) : view.tab === 'contacts' ? (
          <TableView
            data={rows}
            onOpenContact={openContact}
            onOpenCompany={openCompany}
            onRefresh={refresh}
            views={viewsConfig.contacts}
            activeViewId={activeContactView}
            onActiveViewChange={setActiveContactView}
            onSaveViews={persistContactsViews}
            lists={listsConfig.contacts}
            onSaveLists={async (next) => persistLists({ ...listsConfig, contacts: next })}
          />
        ) : view.tab === 'companies' ? (
          <CompaniesView
            companies={companies}
            contacts={rows}
            onOpenCompany={openCompany}
            onOpenContact={openContact}
            onRefresh={refresh}
            views={viewsConfig.companies}
            activeViewId={activeCompanyView}
            onActiveViewChange={setActiveCompanyView}
            onSaveViews={persistCompaniesViews}
            lists={listsConfig.companies}
            onSaveLists={async (next) => persistLists({ ...listsConfig, companies: next })}
          />
        ) : view.tab === 'lists' ? (
          <ListsView
            lists={listsConfig}
            onOpenList={openList}
            onSaveLists={persistLists}
          />
        ) : (
          view.tab === 'calls' ? (
            <CallsView calls={calls} contacts={rows} onOpenContact={openContact} />
          ) : (
            <PropertiesView companies={companies} contacts={contacts} calls={calls} />
          )
        )}
      </main>
      <ChatAssistant
        companies={companies}
        rows={rows}
        calls={calls}
        activeContext={activeContext}
        crmRules={crmRules}
        icpRules={icpRules}
        onRefresh={refresh}
      />
    </div>
  )
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {children}
    </button>
  )
}
