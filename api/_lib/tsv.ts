export function toTSV(headers: string[], rows: Record<string, string>[]): string {
  const lines = [headers.join('\t')]
  for (const row of rows) {
    lines.push(headers.map((h) => (row[h] ?? '').replace(/\n/g, ' ')).join('\t'))
  }
  return lines.join('\n') + '\n'
}

export function sanitize(value: string): string {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\t+/g, ' ')
    .trim()
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

type AuditEntry = { by: string; at: string }
type FieldAudit = { current?: AuditEntry; previous?: AuditEntry }
export type AuditData = Record<string, Record<string, Record<string, FieldAudit>>>

export function shiftAudit(
  audit: AuditData,
  table: string,
  rowId: string,
  field: string,
  by: string,
  at: string,
): void {
  if (!audit[table]) audit[table] = {}
  if (!audit[table][rowId]) audit[table][rowId] = {}
  const fa: FieldAudit = audit[table][rowId][field] ?? {}
  if (fa.current) fa.previous = fa.current
  fa.current = { by, at }
  audit[table][rowId][field] = fa
}

const NEVER_AUDITED = new Set(['id', 'created_by', 'created_at', 'updated_by', 'updated_at'])
export { NEVER_AUDITED }
