import type { Company, CRMRow, Call } from '../parseTSV'

export type ActiveContext =
  | { kind: 'company'; company: Company }
  | { kind: 'contact'; contact: CRMRow }
  | null

function isActiveContact(row: CRMRow): boolean {
  return !!(
    row._effective_funnel_stage ||
    row.Temperature ||
    row._calls.length > 0 ||
    row.Summary ||
    row._email ||
    row._phone ||
    row._funnel_stage
  )
}

export function buildSystemPrompt(
  rows: CRMRow[],
  companies: Company[],
  calls: Call[],
  activeContext: ActiveContext,
  crmRules: string,
  icpRules: string,
): string {
  const activeContacts = rows.filter(isActiveContact)

  const activeContactIds = new Set(activeContacts.map((r) => r._id))
  const activeCompanyIds = new Set(
    activeContacts.map((r) => r._company_id).filter(Boolean),
  )
  const contactById = new Map(rows.map((r) => [r._id, r]))

  const contactsJson = activeContacts.map((r) => ({
    id: r._id,
    name: r.Contact,
    job_title: r['Job title'],
    company: r.Company,
    company_id: r._company_id,
    funnel_stage: r._effective_funnel_stage,
    temperature: r.Temperature,
    score_icp: r._company?.score_icp ?? '',
    uses_netsoins: r._company?.uses_netsoins ?? '',
    groupe: r._company?.Groupe ?? '',
    nb_etablissements: r._company?.nb_etablissements ?? '',
    calls_count: r._calls.length,
    last_call: r['Last contact'],
    next_action: r._effective_next_action,
    recap: r.Summary,
    email: r._email,
    phone: r._phone,
  }))

  const callsJson = calls.map((c) => {
    const ct = contactById.get(c.contact_id)
    return {
      id: c.id,
      contact_id: c.contact_id,
      contact_name: ct?.Contact ?? '',
      date: c.date,
      type: c.type,
      summary: c.summary,
      next_action: c.next_action,
    }
  })

  const activeCompaniesJson = companies
    .filter((co) => activeCompanyIds.has(co.id))
    .map((co) => ({
      id: co.id,
      name: co.name,
      groupe: co.Groupe,
      score_icp: co.score_icp,
      uses_netsoins: co.uses_netsoins,
      nb_etablissements: co.nb_etablissements,
      city: co.city,
      funnel_stage: co.funnel_stage,
      next_action: co.next_action,
    }))

  // Global stats
  const totalCompanies = companies.length
  const s0 = companies.filter((c) => c.score_icp === '0').length
  const s1 = companies.filter((c) => c.score_icp === '1').length
  const s2 = companies.filter((c) => c.score_icp === '2').length
  const chaud = rows.filter((r) => r.Temperature === 'Chaud').length
  const tiede = rows.filter((r) => r.Temperature === 'Tiède').length
  const froid = rows.filter((r) => r.Temperature === 'Froid').length
  const totalContacts = rows.length
  const activeContactsCount = activeContactIds.size

  const stats = {
    total_companies: totalCompanies,
    score_breakdown: { s0, s1, s2 },
    temperature_breakdown: { Chaud: chaud, Tiede: tiede, Froid: froid },
    total_contacts: totalContacts,
    active_contacts: activeContactsCount,
  }

  let contextBlock = ''
  if (activeContext) {
    if (activeContext.kind === 'company') {
      const co = activeContext.company
      const companyContacts = rows.filter((r) => r._company_id === co.id)
      contextBlock = `
## Contexte actif : Entreprise
${JSON.stringify(
  {
    id: co.id,
    name: co.name,
    groupe: co.Groupe,
    score_icp: co.score_icp,
    uses_netsoins: co.uses_netsoins,
    nb_etablissements: co.nb_etablissements,
    city: co.city,
    funnel_stage: co.funnel_stage,
    next_action: co.next_action,
    notes: co.notes,
    website: co.website,
  },
  null,
  2,
)}

Contacts de cette entreprise :
${JSON.stringify(
  companyContacts.map((r) => ({
    id: r._id,
    name: r.Contact,
    job_title: r['Job title'],
    temperature: r.Temperature,
    funnel_stage: r._funnel_stage,
    calls_count: r._calls.length,
    last_call: r['Last contact'],
    next_action: r._effective_next_action,
    recap: r.Summary,
  })),
  null,
  2,
)}`
    } else {
      const ct = activeContext.contact
      contextBlock = `
## Contexte actif : Contact
${JSON.stringify(
  {
    id: ct._id,
    name: ct.Contact,
    job_title: ct['Job title'],
    company: ct.Company,
    company_id: ct._company_id,
    funnel_stage: ct._effective_funnel_stage,
    temperature: ct.Temperature,
    score_icp: ct._company?.score_icp ?? '',
    calls_count: ct._calls.length,
    last_call: ct['Last contact'],
    next_action: ct._effective_next_action,
    recap: ct.Summary,
    email: ct._email,
    phone: ct._phone,
    calls: ct._calls.map((c) => ({
      id: c.id,
      date: c.date,
      type: c.type,
      summary: c.summary,
      next_action: c.next_action,
    })),
  },
  null,
  2,
)}`
    }
  }

  return `Tu es l'assistant CRM de Speakli. Tu aides à loguer des appels, mettre à jour les informations contacts/entreprises, et répondre aux questions sur le pipeline commercial.

## Format de réponse OBLIGATOIRE
Tu dois TOUJOURS répondre UNIQUEMENT avec du JSON valide (sans backticks, sans markdown), exactement selon ce format :
{"message":"...","awaiting_confirmation":false,"proposed_changes":null}

Quand tu proposes des modifications CRM :
{"message":"Résumé + Tu confirmes ?","awaiting_confirmation":true,"proposed_changes":{"new_call":{"contact_id":"id","contact_name":"Nom","date":"YYYY-MM-DD","type":"Appel","summary":"...","next_action":"..."},"contact_patch":{"id":"id","name":"Nom","temperature":"Chaud"},"company_patch":{"id":"id","name":"Nom","score_icp":"2","next_action":"...","funnel_stage":"Démo"}}}

Règles :
- Tous les champs de proposed_changes sont optionnels. N'inclure que ce qui change.
- contact_patch peut contenir : temperature, funnel_stage, next_action, recap
- company_patch peut contenir : score_icp, next_action, funnel_stage, notes
- La date d'aujourd'hui est ${new Date().toISOString().slice(0, 10)}
- Ne jamais inventer d'informations. Si tu ne sais pas, dis-le.

## Règles CRM
${crmRules}

## Critères ICP
${icpRules}

## Contacts actifs (${activeContactsCount})
${JSON.stringify(contactsJson)}

## Tous les appels (${calls.length})
${JSON.stringify(callsJson)}

## Entreprises avec contacts actifs (${activeCompaniesJson.length})
${JSON.stringify(activeCompaniesJson)}

## Statistiques globales
${JSON.stringify(stats)}
${contextBlock}`
}
