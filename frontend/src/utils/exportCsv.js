function escapeCell(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} columns
 */
export function buildCsv(rows, columns) {
  const header = columns.map(escapeCell).join(',')
  const lines = rows.map((row) =>
    columns.map((col) => escapeCell(row[col])).join(','),
  )
  return [header, ...lines].join('\n')
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
