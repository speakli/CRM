import type { Row } from '@tanstack/react-table'

/**
 * Filter that handles both single string and string[] (OR semantics).
 * If filterValue is an array, the cell matches if its value is in the array.
 * If filterValue is a single string, exact match.
 */
export function multiEqualsFilter<T>(
  row: Row<T>,
  columnId: string,
  filterValue: unknown,
): boolean {
  const cellValue = String(row.getValue(columnId) ?? '')
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true
    return filterValue.some((v) => String(v) === cellValue)
  }
  if (!filterValue) return true
  return cellValue === String(filterValue)
}

/**
 * Filter for multi-tag CSV columns (cell value = "tag1, tag2").
 * Returns true if any cell tag matches any filter tag.
 */
export function multiTagFilter<T>(
  row: Row<T>,
  columnId: string,
  filterValue: unknown,
): boolean {
  const cellRaw = String(row.getValue(columnId) ?? '')
  const cellTags = cellRaw.split(',').map((t) => t.trim()).filter(Boolean)
  const filterArr = Array.isArray(filterValue) ? filterValue : filterValue ? [String(filterValue)] : []
  if (filterArr.length === 0) return true
  return cellTags.some((t) => filterArr.includes(t))
}
