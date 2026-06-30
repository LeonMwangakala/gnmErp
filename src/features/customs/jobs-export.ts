import { downloadReportWorkbook } from '@/lib/report-excel-export'
import type { JobListItem } from './job-workflow'
import { displayWorkflowStatus, formatListDate, formatDateTime } from './job-workflow'

export type ExportColumn = {
  header: string
  value: (row: JobListItem) => string | number
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function escapeCsvCell(value: string | number): string {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function exportJobsCsv(
  rows: JobListItem[],
  columns: ExportColumn[],
  filename: string
): void {
  const headerLine = columns.map((col) => escapeCsvCell(col.header)).join(',')
  const dataLines = rows.map((row) =>
    columns.map((col) => escapeCsvCell(col.value(row))).join(',')
  )
  downloadTextFile(filename, [headerLine, ...dataLines].join('\n'), 'text/csv;charset=utf-8')
}

export function exportJobsExcel(
  rows: JobListItem[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string
): void {
  downloadReportWorkbook(filename, [
    {
      name: sheetName,
      rows: [
        columns.map((col) => col.header),
        ...rows.map((row) => columns.map((col) => col.value(row))),
      ],
    },
  ])
}

export async function exportJobsPdf(
  rows: JobListItem[],
  columns: ExportColumn[],
  filename: string,
  title: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 28
  let y = margin

  doc.setFontSize(12)
  doc.text(title, margin, y)
  y += 18
  doc.setFontSize(8)

  const header = columns.map((col) => col.header).join(' | ')
  const headerLines = doc.splitTextToSize(header, pageWidth - margin * 2)
  doc.text(headerLines, margin, y)
  y += headerLines.length * 10 + 4

  rows.forEach((row) => {
    const line = columns.map((col) => String(col.value(row) ?? '')).join(' | ')
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2)
    if (y + wrapped.length * 10 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
    doc.text(wrapped, margin, y)
    y += wrapped.length * 10 + 4
  })

  doc.save(filename)
}

export const ALL_JOBS_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Job No', value: (r) => r.job_no },
  { header: 'Customer', value: (r) => r.customer_name },
  { header: 'Bill of Lading', value: (r) => r.bill_of_lading },
  { header: 'Vessel', value: (r) => r.vessel },
  { header: 'Voyage', value: (r) => r.voyage },
  { header: 'Shipping Line', value: (r) => r.shipping_line },
  { header: 'ETA', value: (r) => formatListDate(r.eta) },
  { header: 'ICD', value: (r) => r.icd },
  { header: 'Containers', value: (r) => r.container_count },
  { header: 'Status', value: (r) => displayWorkflowStatus(r.workflow_status) },
  { header: 'Created', value: (r) => formatDateTime(r.created_at) },
  { header: 'Updated', value: (r) => formatDateTime(r.updated_at) },
]

export const DISCHARGED_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Job No', value: (r) => r.job_no },
  { header: 'Customer', value: (r) => r.customer_name },
  { header: 'Vessel', value: (r) => r.vessel },
  { header: 'Voyage', value: (r) => r.voyage },
  { header: 'ETA', value: (r) => formatListDate(r.eta) },
  { header: 'Discharge Date', value: (r) => formatListDate(r.discharge_date) },
  { header: 'ICD', value: (r) => r.icd },
  { header: 'Bill of Lading', value: (r) => r.bill_of_lading },
  { header: 'Containers', value: (r) => r.container_count },
  { header: 'Status', value: (r) => displayWorkflowStatus(r.workflow_status) },
]

export const CARRYING_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Job No', value: (r) => r.job_no },
  { header: 'Customer', value: (r) => r.customer_name },
  { header: 'Truck', value: (r) => r.truck_number },
  { header: 'Driver', value: (r) => r.driver },
  { header: 'Pickup Date', value: (r) => formatListDate(r.pickup_date) },
  { header: 'ICD Destination', value: (r) => r.icd_destination },
  { header: 'Containers', value: (r) => r.container_numbers_label },
  { header: 'Location', value: (r) => r.current_location },
  { header: 'Expected Arrival', value: (r) => formatListDate(r.expected_arrival) },
  { header: 'Status', value: (r) => displayWorkflowStatus(r.workflow_status) },
]

export const ARRIVED_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Job No', value: (r) => r.job_no },
  { header: 'Customer', value: (r) => r.customer_name },
  { header: 'Arrival Date', value: (r) => formatListDate(r.arrival_date) },
  { header: 'ICD', value: (r) => r.icd },
  { header: 'Warehouse', value: (r) => r.warehouse },
  { header: 'Truck', value: (r) => r.truck_number },
  { header: 'Containers', value: (r) => r.container_numbers_label },
  { header: 'Status', value: (r) => displayWorkflowStatus(r.workflow_status) },
]

export const NOT_ARRIVED_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Job No', value: (r) => r.job_no },
  { header: 'Customer', value: (r) => r.customer_name },
  { header: 'Truck', value: (r) => r.truck_number },
  { header: 'Driver', value: (r) => r.driver },
  { header: 'Pickup Date', value: (r) => formatListDate(r.pickup_date) },
  { header: 'Expected Arrival', value: (r) => formatListDate(r.expected_arrival) },
  { header: 'Delay', value: (r) => r.delay_duration || '—' },
  { header: 'Destination', value: (r) => r.destination },
  { header: 'Containers', value: (r) => r.container_numbers_label },
  { header: 'Remarks', value: (r) => r.remarks },
]

export function exportColumnsForTab(tab: string): ExportColumn[] {
  switch (tab) {
    case 'discharged':
      return DISCHARGED_EXPORT_COLUMNS
    case 'carrying':
      return CARRYING_EXPORT_COLUMNS
    case 'arrived':
      return ARRIVED_EXPORT_COLUMNS
    case 'not_arrived':
      return NOT_ARRIVED_EXPORT_COLUMNS
    default:
      return ALL_JOBS_EXPORT_COLUMNS
  }
}
