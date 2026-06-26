import * as XLSX from 'xlsx'

/** Excel sheet names are limited to 31 characters and cannot contain \\ / ? * [ ] */
export function sanitizeSheetName(name: string): string {
  const cleaned = String(name || 'Sheet')
    .replace(/[\\/*?:[\]]/g, ' ')
    .trim()
  return (cleaned || 'Sheet').slice(0, 31)
}

export function buildReportSheetRows(
  title: string,
  dateRangeLabel: string | undefined,
  headers: string[],
  dataRows: Array<Array<string | number | null | undefined>>
): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [[title]]
  if (dateRangeLabel) {
    rows.push([dateRangeLabel])
  }
  rows.push([])
  rows.push(headers)
  dataRows.forEach((row) => {
    rows.push(row.map((cell) => (cell == null ? '' : cell)))
  })
  return rows
}

export function downloadReportWorkbook(
  filename: string,
  sheets: Array<{ name: string; rows: Array<Array<string | number>> }>
): void {
  const workbook = XLSX.utils.book_new()
  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheet.name))
  })
  XLSX.writeFile(workbook, filename)
}

export function reportDateRangeLabel(
  dateFrom: string,
  dateTo: string,
  fromLabel = 'From',
  toLabel = 'To'
): string {
  return `${fromLabel}: ${dateFrom}, ${toLabel}: ${dateTo}`
}
