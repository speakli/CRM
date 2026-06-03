export type AuditEntry = { by: string; at: string }
export type FieldAudit = { current?: AuditEntry; previous?: AuditEntry }
export type AuditTable = 'companies' | 'contacts' | 'calls'
export type AuditFile = {
  companies: Record<string, Record<string, FieldAudit>>
  contacts: Record<string, Record<string, FieldAudit>>
  calls: Record<string, Record<string, FieldAudit>>
}

const EMPTY: AuditFile = { companies: {}, contacts: {}, calls: {} }

export async function fetchAudit(): Promise<AuditFile> {
  const r = await fetch('/api/audit', { cache: 'no-store' })
  if (!r.ok) return EMPTY
  try {
    const parsed = (await r.json()) as Partial<AuditFile>
    return {
      companies: parsed.companies ?? {},
      contacts: parsed.contacts ?? {},
      calls: parsed.calls ?? {},
    }
  } catch {
    return EMPTY
  }
}

export function getFieldAudit(
  audit: AuditFile | null,
  table: AuditTable,
  rowId: string,
  field: string,
): FieldAudit | undefined {
  if (!audit || !audit[table]) return undefined
  return audit[table][rowId]?.[field]
}
