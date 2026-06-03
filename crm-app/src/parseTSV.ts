export type AuditFields = {
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

export type Company = {
  id: string
  name: string
  type_etablissement: string
  nb_etablissements: string
  funnel_stage: string
  address: string
  phone: string
  linkedin_url: string
  DUI: string
  employees: string
  tagline: string
  summary: string
  notes: string
  next_action: string
  website: string
  industry: string
  uses_netsoins: string
  score_icp: string
  city: string
  region: string
  country: string
  'Numéro Finess': string
  Typologie: string
  Groupe: string
  'Téléphones Clean Export': string
  Mail: string
  Adresse: string
  'Code postal': string
  Ville: string
  Département: string
  'Total de lits': string
  'Estimation Lits': string
  'Chambres simples': string
  'Chambres doubles': string
  Place: string
  "Taille d'établissement": string
  'Prix minimum mensuel': string
  'CA Hébergement annuel': string
  '% Places APA': string
} & AuditFields

export type Contact = {
  id: string
  company_id: string
  DUI: string
  name: string
  job_title: string
  funnel_stage: string
  linkedin: string
  email: string
  phone: string
  temperature: string
  recap: string
  next_action: string
  website: string
  source: string
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

export type Call = {
  id: string
  contact_id: string
  date: string
  type: string
  summary: string
  next_action: string
} & AuditFields

export type CRMRow = {
  Contact: string
  Company: string
  'Job title': string
  LinkedIn: string
  Website: string
  Summary: string
  Temperature: string
  'Calls count': string
  'Last contact': string
  'Date added': string
  'Next action': string
  Source: string
  _id: string
  _company_id: string
  _company: Company | null
  _calls: Call[]
  _email: string
  _phone: string
  _funnel_stage: string
  _effective_funnel_stage: string
  _effective_next_action: string
  _effective_next_action_source: 'company' | 'self' | 'contact-fallback' | 'none'
  _effective_next_action_contact_id?: string
  _suggested_temperature: string
  _created_by: string
  _created_at: string
  _updated_by: string
  _updated_at: string
}

export function suggestTemperature(
  effectiveFunnelStage: string,
  scoreIcp: string,
  callsCount: number,
): string {
  const score = parseInt(scoreIcp, 10) || 0
  if (effectiveFunnelStage === 'Démo' || effectiveFunnelStage === 'Négociation' || score >= 4) {
    return 'Chaud'
  }
  if ((effectiveFunnelStage === 'Premier contact' && score >= 3) || callsCount > 0) {
    return 'Tiède'
  }
  return 'Froid'
}

function parseTSVRows<T>(text: string): T[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0)
  if (lines.length === 0) return []
  const headers = lines[0].split('\t')
  return lines.slice(1).map((line) => {
    const cells = line.split('\t')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
    return row as unknown as T
  })
}

export function parseCompanies(text: string): Company[] {
  return parseTSVRows<Company>(text)
}

export function parseContacts(text: string): Contact[] {
  return parseTSVRows<Contact>(text)
}

export function parseCalls(text: string): Call[] {
  return parseTSVRows<Call>(text)
}

export function joinData(
  companies: Company[],
  contacts: Contact[],
  calls: Call[],
): CRMRow[] {
  const companyById = new Map(companies.map((c) => [c.id, c]))
  const callsByContact = new Map<string, Call[]>()
  calls.forEach((c) => {
    const arr = callsByContact.get(c.contact_id) ?? []
    arr.push(c)
    callsByContact.set(c.contact_id, arr)
  })
  return contacts.map((ct) => {
    const company = ct.company_id ? companyById.get(ct.company_id) ?? null : null
    const myCalls = (callsByContact.get(ct.id) ?? [])
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
    const lastDate = myCalls.length > 0 ? myCalls[myCalls.length - 1].date : ''

    const effFunnel = company?.funnel_stage || ct.funnel_stage || ''
    const suggestedTemp = suggestTemperature(effFunnel, company?.score_icp ?? '', myCalls.length)

    let effNa = ''
    let effNaSource: 'company' | 'self' | 'contact-fallback' | 'none' = 'none'
    let effNaContact: string | undefined
    if (company?.next_action) {
      effNa = company.next_action
      effNaSource = 'company'
    } else if (ct.next_action) {
      effNa = ct.next_action
      effNaSource = 'self'
    }

    return {
      Contact: ct.name,
      Company: company?.name ?? '',
      'Job title': ct.job_title,
      LinkedIn: ct.linkedin,
      Website: company?.website ?? '',
      Summary: ct.recap,
      Temperature: ct.temperature,
      'Calls count': String(myCalls.length),
      'Last contact': lastDate,
      'Date added': ct.created_at,
      'Next action': ct.next_action,
      Source: ct.source,
      _id: ct.id,
      _company_id: ct.company_id,
      _company: company,
      _calls: myCalls,
      _email: ct.email,
      _phone: ct.phone,
      _funnel_stage: ct.funnel_stage,
      _effective_funnel_stage: effFunnel,
      _effective_next_action: effNa,
      _effective_next_action_source: effNaSource,
      _effective_next_action_contact_id: effNaContact,
      _suggested_temperature: ct.temperature ? '' : suggestedTemp,
      _created_by: ct.created_by,
      _created_at: ct.created_at,
      _updated_by: ct.updated_by,
      _updated_at: ct.updated_at,
    }
  })
}
