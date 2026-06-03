import type { Table } from '@tanstack/react-table'

function csvEscape(value: unknown): string {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function slugifyFilename(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function exportTableToCSV<T>(
  table: Table<T>,
  options: {
    table: 'contacts' | 'companies' | 'calls'
    viewName?: string
  },
) {
  const visibleCols = table.getVisibleLeafColumns()
  const header = visibleCols.map((col) => {
    const def = col.columnDef
    if (typeof def.header === 'string') return def.header
    return col.id
  })
  const rows = table.getRowModel().rows.map((row) =>
    visibleCols.map((col) => csvEscape(row.getValue(col.id))),
  )
  const csv = [
    header.map(csvEscape).join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n')

  const today = new Date().toISOString().slice(0, 10)
  const viewPart = options.viewName ? `-${slugifyFilename(options.viewName)}` : ''
  const filename = `${options.table}${viewPart}-${today}.csv`

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
