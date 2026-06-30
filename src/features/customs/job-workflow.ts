import type { ReactNode } from 'react'

export type JobWorkflowTab = 'all' | 'discharged' | 'carrying' | 'arrived' | 'not_arrived'

export type JobWorkflowStatus = 'DISCHARGED' | 'CARRYING' | 'ARRIVED'

export type JobListItem = {
  id: number
  job_no: string
  file_number: string
  customer_name: string
  bill_of_lading: string
  mbl_no: string
  hbl_no: string
  tansad_no: string
  vessel: string
  voyage: string
  shipping_line: string
  eta: string
  discharge_date: string
  arrival_date: string
  pickup_date: string
  expected_arrival: string
  icd: string
  icd_destination: string
  warehouse: string
  current_location: string
  container_count: number
  container_numbers: string[]
  container_numbers_label: string
  truck_number: string
  driver: string
  destination: string
  workflow_status: JobWorkflowStatus | null
  current_status: JobWorkflowStatus | null
  is_overdue: boolean
  delay_duration: string | null
  remarks: string
  created_at: string
  updated_at: string
  date_of_receipt: string
}

export type JobListSummary = {
  all: number
  discharged: number
  carrying: number
  arrived: number
  not_arrived: number
}

export type JobListFilters = {
  search: string
  date_from: string
  date_to: string
  customer: string
  vessel: string
  shipping_line: string
  icd: string
  workflow_status: string
  file_number: string
  bill_of_lading: string
}

export const EMPTY_JOB_FILTERS: JobListFilters = {
  search: '',
  date_from: '',
  date_to: '',
  customer: '',
  vessel: '',
  shipping_line: '',
  icd: '',
  workflow_status: '',
  file_number: '',
  bill_of_lading: '',
}

export const WORKFLOW_TAB_LABELS: Record<JobWorkflowTab, string> = {
  all: 'All Jobs',
  discharged: 'Discharged',
  carrying: 'Carrying',
  arrived: 'Arrived',
  not_arrived: 'Not Arrived',
}

export const WORKFLOW_STATUS_LABELS: Record<JobWorkflowStatus, string> = {
  DISCHARGED: 'Discharged',
  CARRYING: 'Carrying',
  ARRIVED: 'Arrived',
}

export function workflowStatusBadgeClass(status: string | null | undefined, tab?: JobWorkflowTab): string {
  if (tab === 'not_arrived') {
    return 'border-red-200 bg-red-50 text-red-700 hover:bg-red-50'
  }
  switch (status) {
    case 'DISCHARGED':
      return 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50'
    case 'CARRYING':
      return 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50'
    case 'ARRIVED':
      return 'border-green-200 bg-green-50 text-green-700 hover:bg-green-50'
    default:
      return ''
  }
}

export function displayWorkflowStatus(status: string | null | undefined, tab?: JobWorkflowTab): string {
  if (tab === 'not_arrived') return 'Not Arrived'
  if (!status) return '—'
  return WORKFLOW_STATUS_LABELS[status as JobWorkflowStatus] ?? status
}

export function formatListDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = value.slice(0, 10)
  return d || '—'
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export type JobListColumn = {
  key: string
  label: string
  sortable?: boolean
  className?: string
  render: (row: JobListItem) => ReactNode
}
