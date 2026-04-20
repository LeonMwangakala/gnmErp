import { useState, useCallback, useRef, useEffect } from 'react'
import AsyncSelect from 'react-select/async'
import {
  format,
  parse,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  startOfDay,
  endOfDay,
} from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Download, FileText, CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  customerApi,
  userApi,
  paymentApi,
  invoiceApi,
  type InvoicePaymentReportData,
  type InvoiceReportData,
  type PostedContainersReportData,
} from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ContainerPaymentReportPanel } from './container-payment-report'

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function downloadInvoicePaymentReportCsv(data: InvoicePaymentReportData) {
  const totals = data.totals_by_currency ?? []
  const lines: string[] = [
    ['Date', 'Customer', 'Invoice', 'Amount', 'Paid', 'Account', 'Status', 'Cashier'].join(','),
    ...data.rows.map((r) =>
      [
        escapeCsvCell(r.date),
        escapeCsvCell(r.customer_name),
        escapeCsvCell(r.invoice_number),
        escapeCsvCell(r.invoice_total_formatted ?? ''),
        escapeCsvCell(r.amount_formatted),
        escapeCsvCell(r.account_label),
        escapeCsvCell(r.invoice_status ?? ''),
        escapeCsvCell(r.cashier_name ?? ''),
      ].join(',')
    ),
    '',
    'Summary by account',
    ['Account', 'Total'].join(','),
    ...data.summary_by_account.map((s) =>
      [escapeCsvCell(s.account_label), escapeCsvCell(s.total_formatted)].join(',')
    ),
    '',
    'Totals by currency',
    ['Total', 'Payments'].join(','),
    ...totals.map((t) =>
      [escapeCsvCell(t.total_formatted), String(t.payment_count)].join(',')
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice-payments-report-${data.date_from}-to-${data.date_to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function printInvoicePaymentReportAsPdf(data: InvoicePaymentReportData) {
  const w = window.open('', '_blank')
  if (!w) {
    toast.error('Pop-up blocked. Allow pop-ups to print or save as PDF.')
    return
  }
  const totals = data.totals_by_currency ?? []
  const rowHtml = data.rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.customer_name)}</td><td>${escapeHtml(r.invoice_number)}</td><td class="num">${escapeHtml(r.invoice_total_formatted ?? '')}</td><td class="num">${escapeHtml(r.amount_formatted)}</td><td>${escapeHtml(r.account_label)}</td><td>${escapeHtml(r.invoice_status ?? '')}</td><td>${escapeHtml(r.cashier_name ?? '')}</td></tr>`
    )
    .join('')
  const sumHtml = data.summary_by_account
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.account_label)}</td><td class="num">${escapeHtml(s.total_formatted)}</td></tr>`
    )
    .join('')
  const curTotalsHtml = totals
    .map(
      (t) =>
        `<tr><td class="num">${escapeHtml(t.total_formatted)}</td><td>${t.payment_count}</td></tr>`
    )
    .join('')
  w.document.write(`<!DOCTYPE html><html><head><title>Invoice payments report</title>
<style>
body{font-family:system-ui,sans-serif;padding:16px;font-size:12px;}
h1{font-size:16px;margin-bottom:8px;}
h2{font-size:14px;margin-top:20px;margin-bottom:8px;}
table{border-collapse:collapse;width:100%;margin-top:12px;}
th,td{border:1px solid #ccc;padding:6px;text-align:left;}
th{background:#f0f0f0;}
td.num{text-align:right;}
.meta{color:#444;margin-bottom:16px;}
</style></head><body>
<h1>Invoice payments report</h1>
<div class="meta">${escapeHtml(data.date_from)} &ndash; ${escapeHtml(data.date_to)}</div>
<table><thead><tr><th>Date</th><th>Customer</th><th>Invoice</th><th>Amount</th><th>Paid</th><th>Account</th><th>Status</th><th>Cashier</th></tr></thead>
<tbody>${rowHtml}</tbody></table>
<h2>Summary by account</h2>
<table><thead><tr><th>Account</th><th>Total</th></tr></thead><tbody>${sumHtml}</tbody></table>
<h2>Totals by currency</h2>
<table><thead><tr><th>Total</th><th>Payments</th></tr></thead><tbody>${curTotalsHtml}</tbody></table>
<script>window.onload=function(){window.print();}</script>
</body></html>`)
  w.document.close()
}

function invoiceReportStatusFilterLabel(filter: string): string {
  switch (filter) {
    case 'unpaid':
      return 'Unpaid'
    case 'partial':
      return 'Partial paid'
    case 'paid':
      return 'Paid'
    default:
      return 'All (excl. draft)'
  }
}

function downloadInvoiceReportCsv(data: InvoiceReportData) {
  const lines: string[] = [
    ['Issue date', 'Invoice', 'Customer', 'Total', 'Due', 'Due date', 'Status'].join(','),
    ...data.rows.map((r) =>
      [
        escapeCsvCell(r.issue_date),
        escapeCsvCell(r.invoice_number),
        escapeCsvCell(r.customer_name),
        escapeCsvCell(r.total_formatted),
        escapeCsvCell(r.due_formatted),
        escapeCsvCell(r.due_date),
        escapeCsvCell(r.status_label),
      ].join(',')
    ),
    '',
    'Summary',
    `Invoice count,${data.summary.invoice_count}`,
    `Total amount,${escapeCsvCell(data.summary.total_amount_formatted)}`,
    `Total due,${escapeCsvCell(data.summary.total_due_formatted)}`,
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice-report-${data.date_from}-to-${data.date_to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function printInvoiceReportAsPdf(data: InvoiceReportData) {
  const w = window.open('', '_blank')
  if (!w) {
    toast.error('Pop-up blocked. Allow pop-ups to print or save as PDF.')
    return
  }
  const rowHtml = data.rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.issue_date)}</td><td>${escapeHtml(r.invoice_number)}</td><td>${escapeHtml(r.customer_name)}</td><td class="num">${escapeHtml(r.total_formatted)}</td><td class="num">${escapeHtml(r.due_formatted)}</td><td>${escapeHtml(r.due_date)}</td><td>${escapeHtml(r.status_label)}</td></tr>`
    )
    .join('')
  w.document.write(`<!DOCTYPE html><html><head><title>Invoice report</title>
<style>
body{font-family:system-ui,sans-serif;padding:16px;font-size:12px;}
h1{font-size:16px;margin-bottom:8px;}
table{border-collapse:collapse;width:100%;margin-top:12px;}
th,td{border:1px solid #ccc;padding:6px;text-align:left;}
th{background:#f0f0f0;}
td.num{text-align:right;}
.meta{color:#444;margin-bottom:16px;}
.sum{margin-top:16px;font-size:13px;}
</style></head><body>
<h1>Invoice report</h1>
<div class="meta">${escapeHtml(data.date_from)} &ndash; ${escapeHtml(data.date_to)}<br/>Status: ${escapeHtml(invoiceReportStatusFilterLabel(data.status_filter))}</div>
<table><thead><tr><th>Issue date</th><th>Invoice</th><th>Customer</th><th>Total</th><th>Due</th><th>Due date</th><th>Status</th></tr></thead>
<tbody>${rowHtml}</tbody></table>
<div class="sum"><strong>Invoices:</strong> ${data.summary.invoice_count} &nbsp;|&nbsp; <strong>Total:</strong> ${escapeHtml(data.summary.total_amount_formatted)} &nbsp;|&nbsp; <strong>Due:</strong> ${escapeHtml(data.summary.total_due_formatted)}</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`)
  w.document.close()
}

function downloadPostedContainersReportCsv(data: PostedContainersReportData) {
  const lines: string[] = [
    ['Posted at', 'Container', 'Invoice', 'Customer', 'Posted by'].join(','),
    ...data.rows.map((r) =>
      [
        escapeCsvCell(r.posted_at),
        escapeCsvCell(r.container_no),
        escapeCsvCell(r.invoice_number),
        escapeCsvCell(r.customer_name),
        escapeCsvCell(r.posted_by_name),
      ].join(',')
    ),
    '',
    `Rows,${data.summary.row_count}`,
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `posted-containers-${data.date_from}-to-${data.date_to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function printPostedContainersReportAsPdf(data: PostedContainersReportData) {
  const w = window.open('', '_blank')
  if (!w) {
    toast.error('Pop-up blocked. Allow pop-ups to print or save as PDF.')
    return
  }
  const filterNote = data.container_no_filter
    ? `Container contains: ${escapeHtml(data.container_no_filter)}`
    : 'All containers'
  const rowHtml = data.rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.posted_at)}</td><td>${escapeHtml(r.container_no)}</td><td>${escapeHtml(r.invoice_number)}</td><td>${escapeHtml(r.customer_name)}</td><td>${escapeHtml(r.posted_by_name)}</td></tr>`
    )
    .join('')
  w.document.write(`<!DOCTYPE html><html><head><title>Posted containers report</title>
<style>
body{font-family:system-ui,sans-serif;padding:16px;font-size:12px;}
h1{font-size:16px;margin-bottom:8px;}
table{border-collapse:collapse;width:100%;margin-top:12px;}
th,td{border:1px solid #ccc;padding:6px;text-align:left;}
th{background:#f0f0f0;}
.meta{color:#444;margin-bottom:16px;}
</style></head><body>
<h1>Posted containers (at invoice post)</h1>
<div class="meta">${escapeHtml(data.date_from)} &ndash; ${escapeHtml(data.date_to)}<br/>${filterNote}</div>
<table><thead><tr><th>Posted at</th><th>Container</th><th>Invoice</th><th>Customer</th><th>Posted by</th></tr></thead>
<tbody>${rowHtml || '<tr><td colspan="5">No rows</td></tr>'}</tbody></table>
<p class="meta">${data.summary.row_count} row(s)</p>
<script>window.onload=function(){window.print();}</script>
</body></html>`)
  w.document.close()
}

interface CustomerOption {
  id: number
  value: string
  label: string
  name: string
  email: string
}

type ReportType =
  | 'invoice'
  | 'invoice-payments'
  | 'posted-containers'
  | 'petty-cash'
  | 'expense-payments'
  | 'container-payments'

interface ReportDefinition {
  key: ReportType
  title: string
  description: string
}

const REPORTS: ReportDefinition[] = [
  {
    key: 'invoice',
    title: 'Invoice report',
    description: 'Filter invoices by date range and status.',
  },
  {
    key: 'invoice-payments',
    title: 'Invoice payments report',
    description:
      'Filter invoice payments by date range (today, week, month, or custom) and user.',
  },
  {
    key: 'posted-containers',
    title: 'Posted containers',
    description:
      'Container numbers recorded when invoices were posted, by post date. Optional container filter.',
  },
  {
    key: 'petty-cash',
    title: 'Petty cash report',
    description: 'Filter petty cash expenses by date, category and receiver.',
  },
  {
    key: 'expense-payments',
    title: 'Expense payments report',
    description: 'Filter expense payments by date, vendor, account and category.',
  },
  {
    key: 'container-payments',
    title: 'Container Payment Report',
    description:
      'Enter a container number to list invoice payments for that container, then export to Excel.',
  },
]

/** Set to true to show customer + invoice filters on the invoice payments report */
const SHOW_INVOICE_PAYMENT_CUSTOMER_AND_INVOICE_FILTERS = false

/** Set to true to show the customer filter on the invoice report */
const SHOW_INVOICE_REPORT_CUSTOMER_FILTER = false

type CommonFilters = {
  dateRange: string
}

type InvoiceFilters = {
  dateFrom: string
  dateTo: string
  datePreset: InvoicePaymentDatePreset
  status: 'all' | 'unpaid' | 'partial' | 'paid'
  customerId: string
}

type InvoicePaymentDatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

/** Parse `yyyy-MM-dd` as a local calendar date (avoids UTC shift from parseISO). */
function parseYmdLocal(ymd: string): Date {
  return parse(ymd, 'yyyy-MM-dd', new Date())
}

function getInvoicePaymentRangeForPreset(
  preset: Exclude<InvoicePaymentDatePreset, 'custom'>
): { dateFrom: string; dateTo: string } {
  const now = new Date()
  let start: Date
  let end: Date
  switch (preset) {
    case 'today':
      start = startOfDay(now)
      end = endOfDay(now)
      break
    case 'yesterday': {
      const y = subDays(now, 1)
      start = startOfDay(y)
      end = endOfDay(y)
      break
    }
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfDay(now)
      break
    case 'month':
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    default:
      start = startOfDay(now)
      end = endOfDay(now)
  }
  return {
    dateFrom: format(start, 'yyyy-MM-dd'),
    dateTo: format(end, 'yyyy-MM-dd'),
  }
}

type InvoicePaymentFilters = {
  dateFrom: string
  dateTo: string
  datePreset: InvoicePaymentDatePreset
  userId: string
  customerId: string
  invoiceId: string
}

type PostedContainersFilters = {
  dateFrom: string
  dateTo: string
  datePreset: InvoicePaymentDatePreset
  containerNo: string
}

type PettyCashFilters = CommonFilters & {
  categoryId: string
  receiverFor: 'all' | 'employee' | 'vendor' | 'other'
}

type ExpensePaymentFilters = CommonFilters & {
  vendorId: string
  accountId: string
  categoryId: string
}

type ReportFilters =
  | InvoiceFilters
  | InvoicePaymentFilters
  | PostedContainersFilters
  | PettyCashFilters
  | ExpensePaymentFilters
  | CommonFilters

function isInvoicePaymentFilters(
  f: ReportFilters | null | undefined
): f is InvoicePaymentFilters {
  return f != null && 'invoiceId' in f && 'dateFrom' in f && 'datePreset' in f
}

/** Invoice / payments / posted-containers share preset + custom range dates */
function isDateRangedReportFilters(
  f: ReportFilters | null | undefined
): f is InvoicePaymentFilters | InvoiceFilters | PostedContainersFilters {
  return f != null && 'dateFrom' in f && 'dateTo' in f && 'datePreset' in f
}

function isInvoiceFilters(f: ReportFilters | null | undefined): f is InvoiceFilters {
  return f != null && 'status' in f && 'dateFrom' in f && !('userId' in f)
}

function isPostedContainersFilters(
  f: ReportFilters | null | undefined
): f is PostedContainersFilters {
  return f != null && 'containerNo' in f && 'dateFrom' in f && 'datePreset' in f
}

export function Reports() {
  const [open, setOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null)
  const [filters, setFilters] = useState<ReportFilters | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedInvoiceCustomer, setSelectedInvoiceCustomer] = useState<CustomerOption | null>(null)
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<CustomerOption | null>(null)
  const [staffUsers, setStaffUsers] = useState<{ id: number; name: string; email: string }[]>([])
  const [staffUsersLoading, setStaffUsersLoading] = useState(false)
  const [invoicePaymentReportOpen, setInvoicePaymentReportOpen] = useState(false)
  const [invoicePaymentReportData, setInvoicePaymentReportData] =
    useState<InvoicePaymentReportData | null>(null)
  const [invoicePaymentReportSubmitting, setInvoicePaymentReportSubmitting] = useState(false)
  const [invoiceReportOpen, setInvoiceReportOpen] = useState(false)
  const [invoiceReportData, setInvoiceReportData] = useState<InvoiceReportData | null>(null)
  const [invoiceReportSubmitting, setInvoiceReportSubmitting] = useState(false)
  const [postedContainersReportOpen, setPostedContainersReportOpen] = useState(false)
  const [postedContainersReportData, setPostedContainersReportData] =
    useState<PostedContainersReportData | null>(null)
  const [postedContainersReportSubmitting, setPostedContainersReportSubmitting] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!open || selectedReport?.key !== 'invoice-payments') return
    let cancelled = false
    setStaffUsersLoading(true)
    void userApi
      .getStaffUsersForReports()
      .then((rows) => {
        if (!cancelled) setStaffUsers(rows)
      })
      .catch(() => {
        if (!cancelled) setStaffUsers([])
      })
      .finally(() => {
        if (!cancelled) setStaffUsersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, selectedReport?.key])

  const loadCustomerOptions = useCallback(async (inputValue: string): Promise<CustomerOption[]> => {
    if (!inputValue || inputValue.length < 2) {
      return []
    }
    try {
      const customers = await customerApi.searchCustomers(inputValue, 20)
      return customers.map((customer: any) => ({
        id: customer.id,
        value: String(customer.id),
        label: customer.label || customer.name || customer.customer_name || 'Unknown',
        name: customer.name || customer.customer_name || 'Unknown',
        email: customer.email || '',
      }))
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to search customers:', error)
      return []
    }
  }, [])

  const loadCustomerOptionsDebounced = useCallback(
    (inputValue: string, callback: (options: CustomerOption[]) => void) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      debounceTimeoutRef.current = setTimeout(async () => {
        const options = await loadCustomerOptions(inputValue)
        callback(options)
      }, 300)
    },
    [loadCustomerOptions]
  )

  const handleOpenReport = (report: ReportDefinition) => {
    setSelectedReport(report)
    setFilters(getInitialFilters(report.key))
    setSelectedInvoiceCustomer(null)
    setSelectedPaymentCustomer(null)
    setInvoicePaymentReportOpen(false)
    setInvoicePaymentReportData(null)
    setInvoiceReportOpen(false)
    setInvoiceReportData(null)
    setPostedContainersReportOpen(false)
    setPostedContainersReportData(null)
    setOpen(true)
  }

  const submitInvoicePaymentReport = async () => {
    if (!filters || !isInvoicePaymentFilters(filters)) return
    if (!filters.dateFrom || !filters.dateTo) {
      toast.error('Choose a payment date range.')
      return
    }
    setInvoicePaymentReportSubmitting(true)
    try {
      const result = await paymentApi.getInvoicePaymentsReport({
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        ...(filters.userId ? { user_id: filters.userId } : {}),
      })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setInvoicePaymentReportData(result.data)
      setOpen(false)
      setInvoicePaymentReportOpen(true)
    } finally {
      setInvoicePaymentReportSubmitting(false)
    }
  }

  const submitInvoiceReport = async () => {
    if (!filters || !isInvoiceFilters(filters)) return
    if (!filters.dateFrom || !filters.dateTo) {
      toast.error('Choose an invoice date range.')
      return
    }
    setInvoiceReportSubmitting(true)
    try {
      const result = await invoiceApi.getInvoicesReport({
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        status: filters.status,
        ...(filters.customerId ? { customer_id: filters.customerId } : {}),
      })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setInvoiceReportData(result.data)
      setOpen(false)
      setInvoiceReportOpen(true)
    } finally {
      setInvoiceReportSubmitting(false)
    }
  }

  const submitPostedContainersReport = async () => {
    if (!filters || !isPostedContainersFilters(filters)) return
    if (!filters.dateFrom || !filters.dateTo) {
      toast.error('Choose a posted date range.')
      return
    }
    setPostedContainersReportSubmitting(true)
    try {
      const result = await invoiceApi.getPostedContainersReport({
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        ...(filters.containerNo.trim() ? { container_no: filters.containerNo.trim() } : {}),
      })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setPostedContainersReportData(result.data)
      setOpen(false)
      setPostedContainersReportOpen(true)
    } finally {
      setPostedContainersReportSubmitting(false)
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => (prev ? ({ ...prev, [field]: value } as ReportFilters) : prev))
  }

  const applyReportDatePreset = (preset: InvoicePaymentDatePreset) => {
    setFilters((prev) => {
      if (!isDateRangedReportFilters(prev)) return prev
      const p = prev
      if (preset === 'custom') {
        return { ...p, datePreset: 'custom' } as ReportFilters
      }
      const { dateFrom, dateTo } = getInvoicePaymentRangeForPreset(preset)
      return { ...p, datePreset: preset, dateFrom, dateTo } as ReportFilters
    })
  }

  const setReportCustomDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return
    const fromStr = format(range.from, 'yyyy-MM-dd')
    const toStr = range.to ? format(range.to, 'yyyy-MM-dd') : fromStr
    setFilters((prev) => {
      if (!isDateRangedReportFilters(prev)) return prev
      const p = prev
      return {
        ...p,
        datePreset: 'custom',
        dateFrom: fromStr,
        dateTo: toStr,
      } as ReportFilters
    })
  }

  const getInitialFilters = (type: ReportType): ReportFilters => {
    const base: CommonFilters = { dateRange: '' }
    switch (type) {
      case 'invoice': {
        const { dateFrom, dateTo } = getInvoicePaymentRangeForPreset('month')
        return {
          datePreset: 'month' as const,
          dateFrom,
          dateTo,
          status: 'all',
          customerId: '',
        }
      }
      case 'invoice-payments': {
        const { dateFrom, dateTo } = getInvoicePaymentRangeForPreset('month')
        return {
          datePreset: 'month' as const,
          dateFrom,
          dateTo,
          userId: '',
          customerId: '',
          invoiceId: '',
        }
      }
      case 'posted-containers': {
        const { dateFrom, dateTo } = getInvoicePaymentRangeForPreset('month')
        return {
          datePreset: 'month' as const,
          dateFrom,
          dateTo,
          containerNo: '',
        }
        }
      case 'petty-cash':
        return {
          ...base,
          categoryId: '',
          receiverFor: 'all',
        }
      case 'expense-payments':
        return {
          ...base,
          vendorId: '',
          accountId: '',
          categoryId: '',
        }
      case 'container-payments':
        return base
    }
  }

  const handleDownload = async (type: 'pdf' | 'excel') => {
    if (
      !selectedReport ||
      !filters ||
      selectedReport.key === 'container-payments' ||
      selectedReport.key === 'invoice-payments' ||
      selectedReport.key === 'invoice' ||
      selectedReport.key === 'posted-containers'
    )
      return
    try {
      setIsDownloading(true)
      // TODO: Implement backend endpoints for each report type, e.g.:
      // - GET /reports/invoices?format=pdf&...
      // For now we just log the intended payload.
      // eslint-disable-next-line no-console
      console.log('Download report', {
        type: selectedReport.key,
        format: type,
        filters,
      })
      // Placeholder: later replace with window.open or file download logic.
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {REPORTS.map((report) => (
          <Card
            key={report.key}
            className='flex flex-col justify-between border-dashed hover:border-primary/70 cursor-pointer transition-colors'
            onClick={() => handleOpenReport(report)}
          >
            <CardHeader>
              <div className='flex items-center justify-between gap-2'>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <FileText className='h-4 w-4 text-muted-foreground' />
                  {report.title}
                </CardTitle>
              </div>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant='outline' size='sm'>
                Configure &amp; download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={
            selectedReport?.key === 'container-payments'
              ? 'w-[min(1200px,96vw)] max-w-[min(1200px,96vw)] sm:max-w-[min(1200px,96vw)] max-h-[90vh] min-h-[min(560px,85vh)] flex flex-col gap-0 overflow-hidden'
              : undefined
          }
        >
          <DialogHeader
            className={
              selectedReport?.key === 'container-payments' ? 'mb-[10px]' : undefined
            }
          >
            <DialogTitle>
              {selectedReport?.key === 'container-payments'
                ? 'Container Payment Report'
                : selectedReport
                  ? `${selectedReport.title} filters`
                  : 'Report filters'}
            </DialogTitle>
          </DialogHeader>

          {selectedReport?.key === 'container-payments' ? (
            <div className='overflow-y-auto pr-1 -mr-1 min-h-0'>
              <ContainerPaymentReportPanel />
            </div>
          ) : null}

          {filters && selectedReport?.key !== 'container-payments' && (
            <div className='space-y-4'>
              {selectedReport?.key !== 'invoice-payments' &&
                selectedReport?.key !== 'invoice' &&
                selectedReport?.key !== 'posted-containers' &&
                'dateRange' in filters && (
              <div className='space-y-2'>
                <Label htmlFor='dateRange'>Date range</Label>
                <Input
                  id='dateRange'
                  placeholder='YYYY-MM-DD to YYYY-MM-DD (optional)'
                    value={(filters as CommonFilters).dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                />
              </div>
              )}

              {(selectedReport?.key === 'invoice-payments' ||
                selectedReport?.key === 'invoice' ||
                selectedReport?.key === 'posted-containers') &&
                isDateRangedReportFilters(filters) && (
                  <div className='space-y-3'>
                    <Label>
                      {selectedReport.key === 'invoice-payments'
                        ? 'Payment date range'
                        : selectedReport.key === 'posted-containers'
                          ? 'Posted date range'
                          : 'Invoice date range'}
                    </Label>
                    <div className='flex flex-wrap gap-2'>
                      {(
                        [
                          ['today', 'Today'],
                          ['yesterday', 'Yesterday'],
                          ['week', 'Week'],
                          ['month', 'Month'],
                          ['custom', 'Custom'],
                        ] as const
                      ).map(([key, label]) => {
                        const active = filters.datePreset === key
                        return (
                          <Button
                            key={key}
                            type='button'
                            size='sm'
                            variant={active ? 'default' : 'outline'}
                            className='h-8'
                            onClick={() => applyReportDatePreset(key)}
                          >
                            {label}
                          </Button>
                        )
                      })}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-9 w-full justify-start text-start font-normal sm:w-[min(100%,280px)]'
                        >
                          <CalendarIcon className='mr-2 h-4 w-4 opacity-70' />
                          {(() => {
                            const dr = filters
                            if (!dr.dateFrom || !dr.dateTo) {
                              return <span className='text-muted-foreground'>Pick a date range</span>
                            }
                            const a = parseYmdLocal(dr.dateFrom)
                            const b = parseYmdLocal(dr.dateTo)
                            if (dr.dateFrom === dr.dateTo) {
                              return format(a, 'MMM d, yyyy')
                            }
                            return `${format(a, 'MMM d, yyyy')} – ${format(b, 'MMM d, yyyy')}`
                          })()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          key={`${filters.dateFrom}-${filters.dateTo}`}
                          mode='range'
                          captionLayout='dropdown'
                          numberOfMonths={2}
                          defaultMonth={parseYmdLocal(
                            filters.dateFrom || format(new Date(), 'yyyy-MM-dd')
                          )}
                          selected={{
                            from: filters.dateFrom
                              ? parseYmdLocal(filters.dateFrom)
                              : undefined,
                            to: filters.dateTo
                              ? parseYmdLocal(filters.dateTo)
                              : undefined,
                          }}
                          onSelect={(range) => setReportCustomDateRange(range)}
                          disabled={(date) => date > endOfDay(new Date()) || date < new Date('2000-01-01')}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className='text-xs text-muted-foreground'>
                      Week = Monday through today. Month = full current calendar month.
                      {selectedReport?.key === 'invoice' && (
                        <>
                          {' '}
                          Invoice report includes rows whose <span className='font-medium'>issue date</span> or{' '}
                          <span className='font-medium'>sent/posted date</span> falls in this range. Status{' '}
                          <span className='font-medium'>All</span> excludes drafts only.
                        </>
                      )}
                    </p>
                  </div>
                )}

              {selectedReport?.key === 'posted-containers' && isPostedContainersFilters(filters) && (
                <div className='space-y-2'>
                  <Label htmlFor='postedContainersFilter'>Container number (optional)</Label>
                  <Input
                    id='postedContainersFilter'
                    placeholder='Contains… e.g. ABCD — leave empty for all'
                    value={filters.containerNo}
                    onChange={(e) => handleFilterChange('containerNo', e.target.value)}
                  />
                  <p className='text-xs text-muted-foreground'>
                    Optional partial match on the stored container number.
                  </p>
                </div>
              )}

              {selectedReport?.key === 'invoice' && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='invoiceStatus'>Status</Label>
                    <Select
                      value={(filters as InvoiceFilters).status}
                      onValueChange={(value) =>
                        handleFilterChange('status', value as InvoiceFilters['status'])
                      }
                    >
                      <SelectTrigger id='invoiceStatus'>
                        <SelectValue placeholder='All statuses' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All</SelectItem>
                        <SelectItem value='unpaid'>Unpaid</SelectItem>
                        <SelectItem value='partial'>Partial paid</SelectItem>
                        <SelectItem value='paid'>Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {SHOW_INVOICE_REPORT_CUSTOMER_FILTER && (
                  <div className='space-y-2'>
                    <Label htmlFor='invoiceCustomer'>Customer (optional)</Label>
                    <AsyncSelect<CustomerOption>
                      value={selectedInvoiceCustomer}
                      onChange={(selected) => {
                        setSelectedInvoiceCustomer(selected)
                        handleFilterChange('customerId', selected ? String(selected.id) : '')
                      }}
                      loadOptions={loadCustomerOptionsDebounced}
                      placeholder='Type customer name or email...'
                      isClearable
                      isSearchable
                      noOptionsMessage={({ inputValue }) =>
                        inputValue.length < 2
                          ? 'Type at least 2 characters to search'
                          : 'No customers found'
                      }
                      loadingMessage={() => 'Searching customers...'}
                      className='react-select-container'
                      classNamePrefix='react-select'
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: '36px',
                          height: '36px',
                          borderColor: state.isFocused
                            ? 'hsl(var(--ring))'
                            : 'hsl(var(--input))',
                          backgroundColor: 'transparent',
                          borderRadius: 'calc(var(--radius) - 2px)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          boxShadow: state.isFocused
                            ? '0 0 0 3px hsl(var(--ring) / 0.5)'
                            : 'none',
                          '&:hover': {
                            borderColor: 'hsl(var(--ring))',
                          },
                        }),
                        input: (base) => ({
                          ...base,
                          margin: 0,
                          padding: 0,
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          padding: '0 8px',
                          height: '36px',
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: 'hsl(var(--foreground))',
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: 'hsl(var(--muted-foreground))',
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'calc(var(--radius) - 2px)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? 'hsl(var(--accent))'
                            : 'transparent',
                          color: 'hsl(var(--foreground))',
                          '&:active': {
                            backgroundColor: 'hsl(var(--accent))',
                          },
                        }),
                      }}
                    />
                  </div>
                  )}
                </>
              )}

              {selectedReport?.key === 'invoice-payments' && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='paymentUser'>User (created by)</Label>
                    <Select
                      value={
                        (filters as InvoicePaymentFilters).userId
                          ? (filters as InvoicePaymentFilters).userId
                          : '__all__'
                      }
                      onValueChange={(v) =>
                        handleFilterChange('userId', v === '__all__' ? '' : v)
                      }
                      disabled={staffUsersLoading}
                    >
                      <SelectTrigger id='paymentUser' className='w-full'>
                        <SelectValue
                          placeholder={
                            staffUsersLoading ? 'Loading users…' : 'All users'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='__all__'>All users</SelectItem>
                        {staffUsers.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name}
                            {u.email ? ` · ${u.email}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {SHOW_INVOICE_PAYMENT_CUSTOMER_AND_INVOICE_FILTERS && (
                    <>
                  <div className='space-y-2'>
                    <Label htmlFor='paymentCustomer'>Customer (optional)</Label>
                    <AsyncSelect<CustomerOption>
                      value={selectedPaymentCustomer}
                      onChange={(selected) => {
                        setSelectedPaymentCustomer(selected)
                        handleFilterChange('customerId', selected ? String(selected.id) : '')
                      }}
                      loadOptions={loadCustomerOptionsDebounced}
                      placeholder='Type customer name or email...'
                      isClearable
                      isSearchable
                      noOptionsMessage={({ inputValue }) =>
                        inputValue.length < 2
                          ? 'Type at least 2 characters to search'
                          : 'No customers found'
                      }
                      loadingMessage={() => 'Searching customers...'}
                      className='react-select-container'
                      classNamePrefix='react-select'
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: '36px',
                          height: '36px',
                          borderColor: state.isFocused
                            ? 'hsl(var(--ring))'
                            : 'hsl(var(--input))',
                          backgroundColor: 'transparent',
                          borderRadius: 'calc(var(--radius) - 2px)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          boxShadow: state.isFocused
                            ? '0 0 0 3px hsl(var(--ring) / 0.5)'
                            : 'none',
                          '&:hover': {
                            borderColor: 'hsl(var(--ring))',
                          },
                        }),
                        input: (base) => ({
                          ...base,
                          margin: 0,
                          padding: 0,
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          padding: '0 8px',
                          height: '36px',
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: 'hsl(var(--foreground))',
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: 'hsl(var(--muted-foreground))',
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'calc(var(--radius) - 2px)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? 'hsl(var(--accent))'
                            : 'transparent',
                          color: 'hsl(var(--foreground))',
                          '&:active': {
                            backgroundColor: 'hsl(var(--accent))',
                          },
                        }),
                      }}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='paymentInvoice'>Invoice (optional ID)</Label>
                    <Input
                      id='paymentInvoice'
                      placeholder='Invoice ID'
                      value={(filters as InvoicePaymentFilters).invoiceId}
                      onChange={(e) => handleFilterChange('invoiceId', e.target.value)}
                    />
                  </div>
                    </>
                  )}
                </>
              )}

              {selectedReport?.key === 'petty-cash' && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='pettyCategory'>Category (optional ID)</Label>
                    <Input
                      id='pettyCategory'
                      placeholder='Category ID'
                      value={(filters as PettyCashFilters).categoryId}
                      onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='receiverFor'>Receiver type</Label>
                    <Select
                      value={(filters as PettyCashFilters).receiverFor}
                      onValueChange={(value) =>
                        handleFilterChange('receiverFor', value as PettyCashFilters['receiverFor'])
                      }
                    >
                      <SelectTrigger id='receiverFor'>
                        <SelectValue placeholder='All' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All</SelectItem>
                        <SelectItem value='employee'>Employee</SelectItem>
                        <SelectItem value='vendor'>Vendor</SelectItem>
                        <SelectItem value='other'>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedReport?.key === 'expense-payments' && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='expenseVendor'>Vendor (optional ID)</Label>
                    <Input
                      id='expenseVendor'
                      placeholder='Vendor ID'
                      value={(filters as ExpensePaymentFilters).vendorId}
                      onChange={(e) => handleFilterChange('vendorId', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='expenseAccount'>Account (optional ID)</Label>
                    <Input
                      id='expenseAccount'
                      placeholder='Account ID'
                      value={(filters as ExpensePaymentFilters).accountId}
                      onChange={(e) => handleFilterChange('accountId', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='expenseCategory'>Category (optional ID)</Label>
                    <Input
                      id='expenseCategory'
                      placeholder='Category ID'
                      value={(filters as ExpensePaymentFilters).categoryId}
                      onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {selectedReport?.key !== 'container-payments' ? (
          <DialogFooter className='mt-4 flex-row justify-between gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                if (selectedReport) {
                  setFilters(getInitialFilters(selectedReport.key))
                  setSelectedInvoiceCustomer(null)
                  setSelectedPaymentCustomer(null)
                    setInvoiceReportData(null)
                    setInvoiceReportOpen(false)
                    setPostedContainersReportData(null)
                    setPostedContainersReportOpen(false)
                }
              }}
            >
              Reset filters
            </Button>
              {selectedReport?.key === 'invoice-payments' ? (
                <Button
                  type='button'
                  size='sm'
                  disabled={
                    invoicePaymentReportSubmitting ||
                    !filters ||
                    !isInvoicePaymentFilters(filters) ||
                    !filters.dateFrom ||
                    !filters.dateTo
                  }
                  onClick={() => void submitInvoicePaymentReport()}
                >
                  {invoicePaymentReportSubmitting ? 'Loading…' : 'Submit'}
                </Button>
              ) : selectedReport?.key === 'invoice' ? (
                <Button
                  type='button'
                  size='sm'
                  disabled={
                    invoiceReportSubmitting ||
                    !filters ||
                    !isInvoiceFilters(filters) ||
                    !filters.dateFrom ||
                    !filters.dateTo
                  }
                  onClick={() => void submitInvoiceReport()}
                >
                  {invoiceReportSubmitting ? 'Loading…' : 'Submit'}
                </Button>
              ) : selectedReport?.key === 'posted-containers' ? (
                <Button
                  type='button'
                  size='sm'
                  disabled={
                    postedContainersReportSubmitting ||
                    !filters ||
                    !isPostedContainersFilters(filters) ||
                    !filters.dateFrom ||
                    !filters.dateTo
                  }
                  onClick={() => void submitPostedContainersReport()}
                >
                  {postedContainersReportSubmitting ? 'Loading…' : 'Submit'}
                </Button>
              ) : (
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={isDownloading}
                onClick={() => void handleDownload('pdf')}
              >
                <Download className='mr-2 h-4 w-4' />
                PDF
              </Button>
              <Button
                type='button'
                size='sm'
                disabled={isDownloading}
                onClick={() => void handleDownload('excel')}
              >
                <Download className='mr-2 h-4 w-4' />
                Excel
              </Button>
            </div>
              )}
          </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={invoicePaymentReportOpen}
        onOpenChange={(next) => {
          setInvoicePaymentReportOpen(next)
          if (!next) setInvoicePaymentReportData(null)
        }}
      >
        <DialogContent className='flex max-h-[min(90vh,800px)] w-[min(1280px,98vw)] max-w-[min(1280px,98vw)] flex-col gap-0 overflow-hidden sm:max-w-[min(1280px,98vw)]'>
          <DialogHeader className='shrink-0'>
            <DialogTitle>Invoice payments report</DialogTitle>
          </DialogHeader>
          {invoicePaymentReportData ? (
            <>
              <p className='text-sm text-muted-foreground shrink-0 pb-2'>
                {invoicePaymentReportData.date_from} – {invoicePaymentReportData.date_to}
                <span className='ms-2'>
                  ({invoicePaymentReportData.rows.length}{' '}
                  {invoicePaymentReportData.rows.length === 1 ? 'payment' : 'payments'})
                </span>
              </p>
              <ScrollArea className='min-h-0 flex-1 pr-3 -mr-1'>
                <div className='space-y-6 pb-4'>
                  <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead className='text-end'>Amount</TableHead>
                        <TableHead className='text-end'>Paid</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cashier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicePaymentReportData.rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className='text-center text-muted-foreground'>
                            No payments in this range.
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoicePaymentReportData.rows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className='whitespace-nowrap tabular-nums'>{r.date}</TableCell>
                            <TableCell className='whitespace-normal'>{r.customer_name}</TableCell>
                            <TableCell className='tabular-nums'>{r.invoice_number}</TableCell>
                            <TableCell className='text-end tabular-nums'>
                              {r.invoice_total_formatted ?? '—'}
                            </TableCell>
                            <TableCell className='text-end tabular-nums'>
                              {r.amount_formatted}
                            </TableCell>
                            <TableCell className='max-w-[220px] whitespace-normal text-muted-foreground'>
                              {r.account_label}
                            </TableCell>
                            <TableCell className='whitespace-nowrap'>{r.invoice_status ?? '—'}</TableCell>
                            <TableCell className='whitespace-normal'>{r.cashier_name ?? '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>

                  <div>
                    <h3 className='mb-2 text-sm font-semibold'>Summary by account</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead className='text-end'>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoicePaymentReportData.summary_by_account.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className='text-center text-muted-foreground'
                            >
                              No totals.
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoicePaymentReportData.summary_by_account.map((s) => (
                            <TableRow
                              key={`${s.account_id}-${s.currency_code}-${s.account_label}`}
                            >
                              <TableCell className='whitespace-normal'>
                                {s.account_label}
                              </TableCell>
                              <TableCell className='text-end tabular-nums'>
                                {s.total_formatted}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    <h3 className='mb-2 mt-6 text-sm font-semibold'>Totals by currency</h3>
                    <ul className='space-y-1 text-sm'>
                      {(invoicePaymentReportData.totals_by_currency ?? []).length === 0 ? (
                        <li className='text-muted-foreground'>No currency totals.</li>
                      ) : (
                        (invoicePaymentReportData.totals_by_currency ?? []).map((t) => (
                          <li key={t.currency_code} className='flex flex-wrap items-baseline gap-x-2'>
                            <span className='tabular-nums font-medium'>{t.total_formatted}</span>
                            <span className='text-muted-foreground text-xs'>
                              ({t.payment_count}{' '}
                              {t.payment_count === 1 ? 'payment' : 'payments'})
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                    <p className='mt-3 text-xs text-muted-foreground'>
                      USD amounts use $; TZS uses TZS. Totals are not converted between currencies.
                    </p>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className='mt-4 shrink-0 flex-row justify-end gap-2 border-t pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    if (invoicePaymentReportData) {
                      downloadInvoicePaymentReportCsv(invoicePaymentReportData)
                    }
                  }}
                >
                  <Download className='mr-2 h-4 w-4' />
                  Excel
                </Button>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => {
                    if (invoicePaymentReportData) {
                      printInvoicePaymentReportAsPdf(invoicePaymentReportData)
                    }
                  }}
                >
                  <Download className='mr-2 h-4 w-4' />
                  PDF
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={invoiceReportOpen}
        onOpenChange={(next) => {
          setInvoiceReportOpen(next)
          if (!next) setInvoiceReportData(null)
        }}
      >
        <DialogContent className='flex max-h-[min(90vh,800px)] w-[min(1100px,96vw)] max-w-[min(1100px,96vw)] flex-col gap-0 overflow-hidden sm:max-w-[min(1100px,96vw)]'>
          <DialogHeader className='shrink-0'>
            <DialogTitle>Invoice report</DialogTitle>
          </DialogHeader>
          {invoiceReportData ? (
            <>
              <p className='text-sm text-muted-foreground shrink-0 pb-2'>
                {invoiceReportData.date_from} – {invoiceReportData.date_to}
                <span className='ms-2'>
                  · Status: {invoiceReportStatusFilterLabel(invoiceReportData.status_filter)}
                </span>
                <span className='ms-2'>
                  ({invoiceReportData.rows.length}{' '}
                  {invoiceReportData.rows.length === 1 ? 'invoice' : 'invoices'})
                </span>
              </p>
              <div className='min-h-0 flex-1 overflow-auto pr-1'>
                <div className='space-y-4 pb-4'>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Issue date</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className='text-end'>Total</TableHead>
                          <TableHead className='text-end'>Due</TableHead>
                          <TableHead>Due date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceReportData.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className='text-center text-muted-foreground'>
                              No invoices in this range.
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoiceReportData.rows.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className='whitespace-nowrap tabular-nums'>
                                {r.issue_date}
                              </TableCell>
                              <TableCell className='tabular-nums'>{r.invoice_number}</TableCell>
                              <TableCell className='whitespace-normal'>{r.customer_name}</TableCell>
                              <TableCell className='text-end tabular-nums'>
                                {r.total_formatted}
                              </TableCell>
                              <TableCell className='text-end tabular-nums'>
                                {r.due_formatted}
                              </TableCell>
                              <TableCell className='whitespace-nowrap tabular-nums'>
                                {r.due_date}
                              </TableCell>
                              <TableCell className='whitespace-nowrap'>{r.status_label}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className='rounded-md border bg-muted/30 px-3 py-2 text-sm'>
                    <span className='font-medium'>Summary: </span>
                    <span className='tabular-nums'>{invoiceReportData.summary.invoice_count}</span>
                    {' invoices · Total '}
                    <span className='tabular-nums'>
                      {invoiceReportData.summary.total_amount_formatted}
                    </span>
                    {' · Due '}
                    <span className='tabular-nums'>
                      {invoiceReportData.summary.total_due_formatted}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter className='mt-4 shrink-0 flex-row justify-end gap-2 border-t pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    if (invoiceReportData) {
                      downloadInvoiceReportCsv(invoiceReportData)
                    }
                  }}
                >
                  <Download className='mr-2 h-4 w-4' />
                  Excel
                </Button>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => {
                    if (invoiceReportData) {
                      printInvoiceReportAsPdf(invoiceReportData)
                    }
                  }}
                >
                  <Download className='mr-2 h-4 w-4' />
                  PDF
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={postedContainersReportOpen}
        onOpenChange={(next) => {
          setPostedContainersReportOpen(next)
          if (!next) setPostedContainersReportData(null)
        }}
      >
        <DialogContent className='flex max-h-[min(90vh,800px)] w-[min(1100px,96vw)] max-w-[min(1100px,96vw)] flex-col gap-0 overflow-hidden sm:max-w-[min(1100px,96vw)]'>
          <DialogHeader className='shrink-0'>
            <DialogTitle>Posted containers</DialogTitle>
          </DialogHeader>
          {postedContainersReportData ? (
            <>
              <p className='text-sm text-muted-foreground shrink-0 pb-2'>
                {postedContainersReportData.date_from} – {postedContainersReportData.date_to}
                {postedContainersReportData.container_no_filter ? (
                  <span className='ms-2'>
                    · Container contains: {postedContainersReportData.container_no_filter}
                  </span>
                ) : null}
                <span className='ms-2'>
                  ({postedContainersReportData.summary.row_count}{' '}
                  {postedContainersReportData.summary.row_count === 1 ? 'row' : 'rows'})
                </span>
              </p>
              <div className='min-h-0 flex-1 overflow-auto pr-1'>
                <div className='space-y-4 pb-4'>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Posted at</TableHead>
                          <TableHead>Container</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Posted by</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {postedContainersReportData.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className='text-center text-muted-foreground'>
                              No rows in this range. Post invoices from the Post Invoices flow with a
                              container number to populate this report.
                            </TableCell>
                          </TableRow>
                        ) : (
                          postedContainersReportData.rows.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className='whitespace-nowrap tabular-nums'>
                                {r.posted_at || '—'}
                              </TableCell>
                              <TableCell className='whitespace-nowrap font-mono text-sm'>
                                {r.container_no || '—'}
                              </TableCell>
                              <TableCell className='tabular-nums'>{r.invoice_number || '—'}</TableCell>
                              <TableCell className='whitespace-normal'>{r.customer_name || '—'}</TableCell>
                              <TableCell className='whitespace-normal'>{r.posted_by_name || '—'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              <DialogFooter className='mt-4 shrink-0 flex-row justify-end gap-2 border-t pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    if (postedContainersReportData) {
                      downloadPostedContainersReportCsv(postedContainersReportData)
                    }
                  }}
                >
                  <Download className='mr-2 h-4 w-4' />
                  Excel
                </Button>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => {
                    if (postedContainersReportData) {
                      printPostedContainersReportAsPdf(postedContainersReportData)
                    }
                  }}
                >
                  <Download className='mr-2 h-4 w-4' />
                  PDF
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

