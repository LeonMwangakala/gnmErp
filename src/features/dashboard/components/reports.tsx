import { useState, useCallback, useRef, useEffect } from 'react'
import AsyncSelect from 'react-select/async'
import {
  format,
  parse,
  parseISO,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  startOfDay,
  endOfDay,
} from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Download, FileText, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
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
  type GoodsDispatchedReportData,
} from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  a.download = `invoice_payment_report_${data.date_from}_to_${data.date_to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadInvoicePaymentReportPdf(data: InvoicePaymentReportData, printedByName?: string) {
  const logoUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/images/gnm_cargo.png` : '/images/gnm_cargo.png'
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
  const printedAt = new Date().toLocaleString()
  const printedBy = (printedByName || '').trim() || 'System'
  const html = `<!DOCTYPE html><html><head><title>Invoice payments report</title>
<style>
@page{size:A4 portrait;margin:0;}
body{font-family:system-ui,sans-serif;padding:10mm;font-size:12px;margin:0;}
h1{font-size:16px;margin:8px 0 8px;text-align:center;text-transform:uppercase;letter-spacing:.04em;}
h2{font-size:14px;margin-top:20px;margin-bottom:8px;}
table{border-collapse:collapse;width:100%;margin-top:12px;}
th,td{border:1px solid #ccc;padding:6px;text-align:left;}
th{background:#f0f0f0;}
td.num{text-align:right;}
.meta{color:#444;margin-bottom:16px;text-align:center;}
.logo-wrap{text-align:center;}
.logo{height:68px;object-fit:contain;}
.print-meta{margin-top:16px;padding-top:8px;border-top:1px solid #ccc;color:#444;line-height:1.5;}
.print-meta__label{font-size:12px;font-weight:700;}
.print-meta__value{font-size:12px;}
</style></head><body>
<div class="logo-wrap"><img src="${logoUrl}" alt="GNM Cargo logo" class="logo" /></div>
<h1>INVOICE PAYMENTS REPORT</h1>
<div class="meta"><strong>START DATE:</strong> ${escapeHtml(data.date_from)} &nbsp; | &nbsp; <strong>END DATE:</strong> ${escapeHtml(data.date_to)}</div>
<table><thead><tr><th>Date</th><th>Customer</th><th>Invoice</th><th>Amount</th><th>Paid</th><th>Account</th><th>Status</th><th>Cashier</th></tr></thead>
<tbody>${rowHtml}</tbody></table>
<h2>Summary by account</h2>
<table><thead><tr><th>Account</th><th>Total</th></tr></thead><tbody>${sumHtml}</tbody></table>
<h2>Totals by currency</h2>
<table><thead><tr><th>Total</th><th>Payments</th></tr></thead><tbody>${curTotalsHtml}</tbody></table>
<div class="print-meta"><span class="print-meta__label">Printed by:</span> <span class="print-meta__value">${escapeHtml(printedBy)}</span><br /><span class="print-meta__label">Printed time:</span> <span class="print-meta__value">${escapeHtml(printedAt)}</span></div>
</body></html>`

  try {
    const { jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.left = '-99999px'
    iframe.style.top = '0'
    iframe.style.width = '1400px'
    iframe.style.height = '2200px'
    iframe.style.opacity = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    try {
      const doc = iframe.contentDocument
      if (!doc) throw new Error('Unable to prepare PDF content')
      doc.open()
      doc.write(html)
      doc.close()

      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve()
        setTimeout(() => resolve(), 400)
      })

      const target = doc.documentElement as HTMLElement | null
      if (!target) throw new Error('Unable to render PDF content')
      const contentWidth = Math.max(
        doc.documentElement.scrollWidth,
        doc.body?.scrollWidth || 0,
        1024
      )
      const contentHeight = Math.max(
        doc.documentElement.scrollHeight,
        doc.body?.scrollHeight || 0,
        1200
      )
      iframe.style.width = `${contentWidth}px`
      iframe.style.height = `${contentHeight}px`

      const canvas = await html2canvas(target, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        width: contentWidth,
        height: contentHeight,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
        scrollX: 0,
        scrollY: 0,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pageWidth = 210
      const pageHeight = 297
      const imageWidthAtFullPage = pageWidth
      const imageHeightAtFullPage = (canvas.height * imageWidthAtFullPage) / canvas.width
      const scale = Math.min(1, pageHeight / imageHeightAtFullPage)
      const finalWidth = imageWidthAtFullPage * scale
      const finalHeight = imageHeightAtFullPage * scale
      const x = (pageWidth - finalWidth) / 2
      const y = (pageHeight - finalHeight) / 2

      // Always fit the report into a single A4 page.
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight)

      pdf.save(`invoice_payment_report_${data.date_from}_to_${data.date_to}.pdf`)
    } finally {
      document.body.removeChild(iframe)
    }
  } catch (error: any) {
    toast.error(error?.message || 'Failed to download invoice payments PDF')
  }
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

function formatGoodsDispatchedAt(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = parseISO(iso)
    if (Number.isNaN(d.getTime())) return iso
    return format(d, 'yyyy-MM-dd HH:mm')
  } catch {
    return iso
  }
}

type DispatchReportExportKey =
  | 'goods-dispatched-cash'
  | 'goods-dispatched-loan'
  | 'loan-balance'
  | 'authorized-pending-dispatch'

function dispatchReportExportTitle(variant: DispatchReportExportKey): string {
  switch (variant) {
    case 'goods-dispatched-cash':
      return 'Goods dispatched on cash'
    case 'goods-dispatched-loan':
      return 'Goods dispatched on loan'
    case 'loan-balance':
      return 'Loan balance'
    case 'authorized-pending-dispatch':
      return 'Authorized — not dispatched'
  }
}

function dispatchReportExportFilename(
  variant: DispatchReportExportKey,
  dateFrom: string,
  dateTo: string,
  ext: 'csv' | 'pdf'
): string {
  const slug =
    variant === 'goods-dispatched-cash'
      ? 'goods-dispatched-cash'
      : variant === 'goods-dispatched-loan'
        ? 'goods-dispatched-loan'
        : variant === 'loan-balance'
          ? 'loan-balance'
          : 'authorized-pending-dispatch'
  return `${slug}-${dateFrom}-to-${dateTo}.${ext}`
}

function dispatchReportReleaseLabel(data: GoodsDispatchedReportData): string {
  if (data.release === 'cash') return 'Cash only'
  if (data.release === 'loan') return 'Credit only'
  return 'Both (cash and credit)'
}

function dispatchReportPaymentStatusLabel(data: GoodsDispatchedReportData): string | null {
  if (!data.payment_status || data.payment_status === 'all') return null
  return data.payment_status === 'paid' ? 'Paid in full' : 'Not paid in full'
}

function downloadLoanBalanceReportCsv(data: GoodsDispatchedReportData) {
  const lines: string[] = [
    ['Report', escapeCsvCell(dispatchReportExportTitle('loan-balance'))].join(','),
    ['Date range', escapeCsvCell(`${data.date_from} – ${data.date_to}`)].join(','),
    ...(dispatchReportPaymentStatusLabel(data)
      ? [['Payment status', escapeCsvCell(dispatchReportPaymentStatusLabel(data)!)].join(',')]
      : []),
    '',
    [
      'Date',
      'Customer Name',
      'Container Number',
      'Goods Pkgs',
      'Invoice No',
      'Invoice Amount',
      'Discount Amount',
      'Paid Amount',
      'Balance',
    ].join(','),
    ...data.rows.map((r) =>
      [
        escapeCsvCell(formatGoodsDispatchedAt(r.dispatched_at)),
        escapeCsvCell(r.customer_name),
        escapeCsvCell(r.container_no ?? ''),
        r.pkgs != null ? String(r.pkgs) : '',
        escapeCsvCell(r.invoice_no ?? ''),
        r.bill_amount != null ? String(r.bill_amount) : '',
        r.bill_discount_amount != null ? String(r.bill_discount_amount) : '',
        r.bill_paid_amount != null ? String(r.bill_paid_amount) : '',
        r.bill_balance != null ? String(r.bill_balance) : '',
      ].join(',')
    ),
    '',
    `Rows,${data.summary.row_count}`,
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dispatchReportExportFilename('loan-balance', data.date_from, data.date_to, 'csv')
  a.click()
  URL.revokeObjectURL(url)
}

function printLoanBalanceReportAsPdf(data: GoodsDispatchedReportData) {
  const w = window.open('', '_blank')
  if (!w) {
    toast.error('Pop-up blocked. Allow pop-ups to print or save as PDF.')
    return
  }
  const paymentLabel = dispatchReportPaymentStatusLabel(data)
  const rowHtml = data.rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(formatGoodsDispatchedAt(r.dispatched_at))}</td><td>${escapeHtml(r.customer_name || '—')}</td><td>${escapeHtml(r.container_no ?? '—')}</td><td class="num">${r.pkgs != null ? escapeHtml(String(r.pkgs)) : '—'}</td><td>${escapeHtml(r.invoice_no ?? '—')}</td><td class="num">${r.bill_amount != null ? escapeHtml(String(r.bill_amount)) : '—'}</td><td class="num">${r.bill_discount_amount != null ? escapeHtml(String(r.bill_discount_amount)) : '—'}</td><td class="num">${r.bill_paid_amount != null ? escapeHtml(String(r.bill_paid_amount)) : '—'}</td><td class="num">${r.bill_balance != null ? escapeHtml(String(r.bill_balance)) : '—'}</td></tr>`
    )
    .join('')
  w.document.write(`<!DOCTYPE html><html><head><title>Loan balance</title>
<style>
body{font-family:system-ui,sans-serif;padding:16px;font-size:12px;}
h1{font-size:16px;margin-bottom:8px;}
table{border-collapse:collapse;width:100%;margin-top:12px;}
th,td{border:1px solid #ccc;padding:6px;text-align:left;}
th{background:#f0f0f0;}
td.num{text-align:right;}
.meta{color:#444;margin-bottom:16px;}
</style></head><body>
<h1>Loan balance</h1>
<div class="meta">${escapeHtml(data.date_from)} &ndash; ${escapeHtml(data.date_to)}${paymentLabel ? `<br/>Payment: ${escapeHtml(paymentLabel)}` : ''}</div>
<table><thead><tr><th>Date</th><th>Customer</th><th>Container</th><th>Pkgs</th><th>Invoice</th><th>Invoice amount</th><th>Discount</th><th>Paid</th><th>Balance</th></tr></thead>
<tbody>${rowHtml || '<tr><td colspan="9">No rows</td></tr>'}</tbody></table>
<p class="meta">${data.summary.row_count} row(s)</p>
<script>window.onload=function(){window.print();}</script>
</body></html>`)
  w.document.close()
}

function downloadGoodsDispatchedReportCsv(
  data: GoodsDispatchedReportData,
  variant: Exclude<DispatchReportExportKey, 'loan-balance'>
) {
  const isPending = variant === 'authorized-pending-dispatch'
  const isCash = variant === 'goods-dispatched-cash'
  const isLoan = variant === 'goods-dispatched-loan'
  const paymentLabel = dispatchReportPaymentStatusLabel(data)
  const headers = [
    isPending ? 'Authorized at' : 'Dispatched at',
    ...(isPending ? ['Days waiting', 'Authorized by'] : []),
    'Dispatch ref',
    ...(isPending ? [] : ['Dispatched by']),
    'Pickup by',
    'Pickup phone',
    'Pickup vehicle',
    'Customer name',
    'Customer company',
    'Consignment name',
    'Tracking #',
    'Consignment label',
    'Consignment pkgs',
    'Consignment CBM',
    'Container',
    'Good name',
    'Supplier receipt',
    'Good qty',
    'Good pkgs',
    'Unit',
    ...(!isCash ? ['Release', 'Dispatched on credit'] : []),
    ...(isLoan ? ['Credit / invoice record'] : []),
    'Invoice',
    ...(isLoan ? ['Invoice amount', 'Discount amount', 'Paid amount'] : []),
    'Paid in full',
    'Balance',
    'Bill status',
  ]
  const lines: string[] = [
    ['Report', escapeCsvCell(dispatchReportExportTitle(variant))].join(','),
    ['Date range', escapeCsvCell(`${data.date_from} – ${data.date_to}`)].join(','),
    ['Release filter', escapeCsvCell(dispatchReportReleaseLabel(data))].join(','),
    ...(paymentLabel ? [['Payment status', escapeCsvCell(paymentLabel)].join(',')] : []),
    '',
    headers.join(','),
    ...data.rows.map((r) => {
      const cells: string[] = [
        escapeCsvCell(
          formatGoodsDispatchedAt(isPending ? r.authorized_at ?? null : r.dispatched_at)
        ),
        ...(isPending
          ? [
              r.days_pending != null ? String(r.days_pending) : '',
              escapeCsvCell(r.authorized_by_name ?? ''),
            ]
          : []),
        escapeCsvCell(r.dispatch_reference),
        ...(isPending ? [] : [escapeCsvCell(r.dispatched_by_name ?? '')]),
        escapeCsvCell(r.pickup_by),
        escapeCsvCell(r.pickup_cellphone),
        escapeCsvCell(r.pickup_vehicle),
        escapeCsvCell(r.customer_name),
        escapeCsvCell(r.customer_company_name),
        escapeCsvCell(r.consignment_name),
        escapeCsvCell(r.consignment_tracking),
        escapeCsvCell(r.consignment_label),
        r.consignment_pkgs != null ? String(r.consignment_pkgs) : '',
        r.consignment_cbm != null ? String(r.consignment_cbm) : '',
        escapeCsvCell(r.container_no ?? ''),
        escapeCsvCell(r.good_name || '—'),
        escapeCsvCell(r.good_supplier_receipt),
        r.quantity != null ? String(r.quantity) : '',
        r.pkgs != null ? String(r.pkgs) : '',
        escapeCsvCell(r.unit ?? ''),
        ...(!isCash
          ? [escapeCsvCell(r.release_type), r.dispatched_on_credit ? 'Yes' : 'No']
          : []),
        ...(isLoan ? [escapeCsvCell(r.credit_dispatch_note)] : []),
        escapeCsvCell(r.invoice_no ?? ''),
        ...(isLoan
          ? [
              r.bill_amount != null ? String(r.bill_amount) : '',
              r.bill_discount_amount != null ? String(r.bill_discount_amount) : '',
              r.bill_paid_amount != null ? String(r.bill_paid_amount) : '',
            ]
          : []),
        r.bill_fully_paid ? 'Yes' : 'No',
        r.bill_balance != null ? String(r.bill_balance) : '',
        escapeCsvCell(r.bill_status ?? ''),
      ]
      return cells.join(',')
    }),
    '',
    'Summary',
    `Rows,${data.summary.row_count}`,
    ...(isCash ? [] : [`Cash lines,${data.summary.cash_rows}`, `Loan lines,${data.summary.loan_rows}`]),
    `Paid in full,${data.summary.paid_rows}`,
    `Not paid in full,${data.summary.unpaid_rows}`,
    ...(isLoan || isPending
      ? [
          `Credit dispatch lines paid,${data.summary.credit_dispatch_paid_rows}`,
          `Credit dispatch lines unpaid,${data.summary.credit_dispatch_unpaid_rows}`,
        ]
      : []),
    ...(isPending
      ? [
          `Max days pending,${data.summary.max_days_pending ?? 0}`,
          `Avg days pending,${data.summary.avg_days_pending ?? 0}`,
        ]
      : []),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dispatchReportExportFilename(variant, data.date_from, data.date_to, 'csv')
  a.click()
  URL.revokeObjectURL(url)
}

function printGoodsDispatchedReportAsPdf(
  data: GoodsDispatchedReportData,
  variant: Exclude<DispatchReportExportKey, 'loan-balance'>
) {
  const w = window.open('', '_blank')
  if (!w) {
    toast.error('Pop-up blocked. Allow pop-ups to print or save as PDF.')
    return
  }
  const isPending = variant === 'authorized-pending-dispatch'
  const isCash = variant === 'goods-dispatched-cash'
  const isLoan = variant === 'goods-dispatched-loan'
  const paymentLabel = dispatchReportPaymentStatusLabel(data)
  const rowHtml = data.rows
    .map((r) => {
      const when = escapeHtml(
        formatGoodsDispatchedAt(isPending ? r.authorized_at ?? null : r.dispatched_at)
      )
      const cells = [
        `<td>${when}</td>`,
        ...(isPending
          ? [
              `<td class="num">${r.days_pending != null ? escapeHtml(String(r.days_pending)) : '—'}</td>`,
              `<td>${escapeHtml(r.authorized_by_name || '—')}</td>`,
            ]
          : []),
        `<td>${escapeHtml(r.dispatch_reference)}</td>`,
        ...(isPending ? [] : [`<td>${escapeHtml(r.dispatched_by_name || '—')}</td>`]),
        `<td>${escapeHtml(r.pickup_by || '—')}</td>`,
        `<td>${escapeHtml(r.pickup_cellphone || '—')}</td>`,
        `<td>${escapeHtml(r.pickup_vehicle || '—')}</td>`,
        `<td>${escapeHtml(r.customer_name)}</td>`,
        `<td>${escapeHtml(r.customer_company_name || '—')}</td>`,
        `<td>${escapeHtml(r.consignment_name || '—')}</td>`,
        `<td>${escapeHtml(r.consignment_tracking || '—')}</td>`,
        `<td>${escapeHtml(r.consignment_label || '—')}</td>`,
        `<td class="num">${r.consignment_pkgs != null ? escapeHtml(String(r.consignment_pkgs)) : '—'}</td>`,
        `<td class="num">${r.consignment_cbm != null ? escapeHtml(String(r.consignment_cbm)) : '—'}</td>`,
        `<td>${escapeHtml(r.container_no ?? '—')}</td>`,
        `<td>${escapeHtml(r.good_name || '—')}</td>`,
        `<td>${escapeHtml(r.good_supplier_receipt || '—')}</td>`,
        `<td class="num">${r.quantity != null ? escapeHtml(String(r.quantity)) : '—'}</td>`,
        `<td class="num">${r.pkgs != null ? escapeHtml(String(r.pkgs)) : '—'}</td>`,
        `<td>${escapeHtml(r.unit ?? '—')}</td>`,
        ...(!isCash
          ? [
              `<td>${escapeHtml(r.release_type === 'loan' ? 'credit' : r.release_type)}</td>`,
              `<td>${r.dispatched_on_credit ? 'Y' : 'N'}</td>`,
            ]
          : []),
        ...(isLoan ? [`<td>${escapeHtml(r.credit_dispatch_note)}</td>`] : []),
        `<td>${escapeHtml(r.invoice_no ?? '—')}</td>`,
        ...(isLoan
          ? [
              `<td class="num">${r.bill_amount != null ? escapeHtml(String(r.bill_amount)) : '—'}</td>`,
              `<td class="num">${r.bill_discount_amount != null ? escapeHtml(String(r.bill_discount_amount)) : '—'}</td>`,
              `<td class="num">${r.bill_paid_amount != null ? escapeHtml(String(r.bill_paid_amount)) : '—'}</td>`,
            ]
          : []),
        `<td>${r.bill_fully_paid ? 'Yes' : 'No'}</td>`,
        `<td class="num">${r.bill_balance != null ? escapeHtml(String(r.bill_balance)) : '—'}</td>`,
        `<td>${escapeHtml(r.bill_status ?? '—')}</td>`,
      ]
      return `<tr>${cells.join('')}</tr>`
    })
    .join('')
  const headerCells = [
    isPending ? 'Authorized' : 'Dispatched',
    ...(isPending ? ['Days', 'Auth. by'] : []),
    'Ref',
    ...(isPending ? [] : ['By']),
    'Pickup',
    'Phone',
    'Vehicle',
    'Customer',
    'Company',
    'Cnsg',
    'Tracking',
    'Label',
    'C.pkgs',
    'CBM',
    'Cont.',
    'Good',
    'Receipt',
    'Qty',
    'Pkgs',
    'U',
    ...(!isCash ? ['Rel.', 'Cr'] : []),
    ...(isLoan ? ['Credit note'] : []),
    'Inv.',
    ...(isLoan ? ['Inv. amt', 'Disc.', 'Paid'] : []),
    'Paid?',
    'Bal.',
    'Bill',
  ]
  const colCount = headerCells.length
  const title = dispatchReportExportTitle(variant)
  w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,sans-serif;padding:16px;font-size:11px;}
h1{font-size:16px;margin-bottom:8px;}
table{border-collapse:collapse;width:100%;margin-top:12px;font-size:8px;}
th,td{border:1px solid #ccc;padding:3px;text-align:left;}
th{background:#f0f0f0;}
td.num{text-align:right;}
.meta{color:#444;margin-bottom:16px;}
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">${escapeHtml(data.date_from)} &ndash; ${escapeHtml(data.date_to)}<br/>
Release: ${escapeHtml(dispatchReportReleaseLabel(data))}${paymentLabel ? `<br/>Payment: ${escapeHtml(paymentLabel)}` : ''}<br/>
${isCash ? `Rows: ${data.summary.row_count}` : `Cash: ${data.summary.cash_rows} · Credit (loan): ${data.summary.loan_rows} · Paid in full: ${data.summary.paid_rows} · Not paid in full: ${data.summary.unpaid_rows}`}${isLoan || isPending ? `<br/>Credit lines · invoice paid: ${data.summary.credit_dispatch_paid_rows} · outstanding: ${data.summary.credit_dispatch_unpaid_rows}` : ''}${isPending ? `<br/>Longest wait: ${data.summary.max_days_pending ?? 0} day(s) · average: ${data.summary.avg_days_pending ?? 0} day(s)` : ''}</div>
<table><thead><tr>${headerCells.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
<tbody>${rowHtml || `<tr><td colspan="${colCount}">No rows</td></tr>`}</tbody></table>
<p class="meta">${data.summary.row_count} row(s)</p>
<script>window.onload=function(){window.print();}</script>
</body></html>`)
  w.document.close()
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
  /** CMTS full name sent as customer_name to dispatch reports */
  name: string
  email: string
  companyName?: string
}

type ReportType =
  | 'invoice'
  | 'invoice-payments'
  | 'posted-containers'
  | 'goods-dispatched-cash'
  | 'goods-dispatched-loan'
  | 'loan-balance'
  | 'authorized-pending-dispatch'
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
    key: 'goods-dispatched-cash',
    title: 'Goods dispatched on cash',
    description:
      'Goods released by dispatch date from CMTS, filtered to cash dispatches only.',
  },
  {
    key: 'goods-dispatched-loan',
    title: 'Goods dispatched on loan',
    description:
      'Goods released by dispatch date from CMTS, filtered to loan dispatches with paid/not paid status and customer filter.',
  },
  {
    key: 'loan-balance',
    title: 'Loan balance',
    description:
      'Loan dispatch balances by dispatch date with invoice amount, paid amount, and outstanding balance.',
  },
  {
    key: 'authorized-pending-dispatch',
    title: 'Authorized — not dispatched',
    description:
      'Goods authorized for pickup but still in the warehouse (pending dispatch). Filter by authorization date; see how long each line has been waiting.',
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

type GoodsDispatchedReleaseFilter = 'all' | 'cash' | 'loan'

type GoodsDispatchedFilters = {
  dateFrom: string
  dateTo: string
  datePreset: InvoicePaymentDatePreset
  releaseFilter: GoodsDispatchedReleaseFilter
  paidFilter: 'all' | 'paid' | 'unpaid'
  customerName: string
  customerCompany: string
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
  | GoodsDispatchedFilters
  | PettyCashFilters
  | ExpensePaymentFilters
  | CommonFilters

function isInvoicePaymentFilters(
  f: ReportFilters | null | undefined
): f is InvoicePaymentFilters {
  return f != null && 'invoiceId' in f && 'dateFrom' in f && 'datePreset' in f
}

/** Invoice / payments / posted-containers / goods-dispatched share preset + custom range dates */
function isDateRangedReportFilters(
  f: ReportFilters | null | undefined
): f is
  | InvoicePaymentFilters
  | InvoiceFilters
  | PostedContainersFilters
  | GoodsDispatchedFilters {
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

function isDispatchReleaseReportFilters(
  f: ReportFilters | null | undefined
): f is GoodsDispatchedFilters {
  return (
    f != null &&
    'dateFrom' in f &&
    'dateTo' in f &&
    'datePreset' in f &&
    'releaseFilter' in f &&
    !('containerNo' in f) &&
    !('status' in f) &&
    !('userId' in f)
  )
}

const GOODS_DISPATCHED_PER_PAGE = 50

function resolveDispatchReportExportKey(
  reportKey: ReportType | undefined,
  reportKind: GoodsDispatchedReportData['report_kind']
): DispatchReportExportKey | null {
  if (reportKind === 'authorized_pending') return 'authorized-pending-dispatch'
  if (
    reportKey === 'goods-dispatched-cash' ||
    reportKey === 'goods-dispatched-loan' ||
    reportKey === 'loan-balance'
  ) {
    return reportKey
  }
  return null
}

function buildDispatchReportQueryParams(
  filters: GoodsDispatchedFilters,
  options?: { page?: number; perPage?: number }
) {
  return {
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    release: filters.releaseFilter,
    ...(options?.page != null
      ? { page: options.page, per_page: options.perPage ?? GOODS_DISPATCHED_PER_PAGE }
      : {}),
    ...(filters.customerName ? { customer_name: filters.customerName } : {}),
    ...(filters.customerCompany ? { customer_company: filters.customerCompany } : {}),
    ...(filters.paidFilter !== 'all' ? { payment_status: filters.paidFilter } : {}),
  }
}

export function Reports() {
  const loggedInUser = useAuthStore((s) => s.auth.user)
  const [open, setOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null)
  const [filters, setFilters] = useState<ReportFilters | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedInvoiceCustomer, setSelectedInvoiceCustomer] = useState<CustomerOption | null>(null)
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<CustomerOption | null>(null)
  const [selectedGoodsDispatchedCustomer, setSelectedGoodsDispatchedCustomer] = useState<CustomerOption | null>(null)
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
  const [goodsDispatchedReportOpen, setGoodsDispatchedReportOpen] = useState(false)
  const [goodsDispatchedReportData, setGoodsDispatchedReportData] =
    useState<GoodsDispatchedReportData | null>(null)
  const [goodsDispatchedReportSubmitting, setGoodsDispatchedReportSubmitting] = useState(false)
  const [goodsDispatchedReportPaging, setGoodsDispatchedReportPaging] = useState(false)
  const [goodsDispatchedReportExporting, setGoodsDispatchedReportExporting] = useState(false)
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

  const loadCmtsReportCustomerOptions = useCallback(
    async (inputValue: string): Promise<CustomerOption[]> => {
      if (!inputValue || inputValue.length < 2) {
        return []
      }
      try {
        const customers = await invoiceApi.searchReportCustomers(inputValue, 50)
        return customers.map((customer) => ({
          id: customer.id,
          value: String(customer.id),
          label: customer.label,
          name: customer.full_name,
          email: '',
          companyName: customer.company_name ?? undefined,
        }))
      } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.error('Failed to search CMTS customers:', error)
        return []
      }
    },
    []
  )

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

  const loadCmtsReportCustomerOptionsDebounced = useCallback(
    (inputValue: string, callback: (options: CustomerOption[]) => void) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      debounceTimeoutRef.current = setTimeout(async () => {
        const options = await loadCmtsReportCustomerOptions(inputValue)
        callback(options)
      }, 300)
    },
    [loadCmtsReportCustomerOptions]
  )

  const handleOpenReport = (report: ReportDefinition) => {
    setSelectedReport(report)
    setFilters(getInitialFilters(report.key))
    setSelectedInvoiceCustomer(null)
    setSelectedPaymentCustomer(null)
    setSelectedGoodsDispatchedCustomer(null)
    setInvoicePaymentReportOpen(false)
    setInvoicePaymentReportData(null)
    setInvoiceReportOpen(false)
    setInvoiceReportData(null)
    setPostedContainersReportOpen(false)
    setPostedContainersReportData(null)
    setGoodsDispatchedReportOpen(false)
    setGoodsDispatchedReportData(null)
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

  const submitDispatchReleaseReport = async (kind: 'dispatched' | 'authorized_pending') => {
    if (!filters || !isDispatchReleaseReportFilters(filters)) return
    if (!filters.dateFrom || !filters.dateTo) {
      toast.error(
        kind === 'authorized_pending'
          ? 'Choose an authorization date range.'
          : 'Choose a dispatch date range.'
      )
      return
    }
    setGoodsDispatchedReportSubmitting(true)
    try {
      const params = buildDispatchReportQueryParams(filters, {
        page: 1,
        perPage: GOODS_DISPATCHED_PER_PAGE,
      })
      const result =
        kind === 'authorized_pending'
          ? await invoiceApi.getAuthorizedPendingDispatchReport(params)
          : await invoiceApi.getGoodsDispatchedReport(params)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setGoodsDispatchedReportData(result.data)
      setOpen(false)
      setGoodsDispatchedReportOpen(true)
    } finally {
      setGoodsDispatchedReportSubmitting(false)
    }
  }

  const fetchGoodsDispatchedReportPage = async (page: number) => {
    if (!goodsDispatchedReportData || !filters || !isDispatchReleaseReportFilters(filters)) return
    setGoodsDispatchedReportPaging(true)
    try {
      const params = buildDispatchReportQueryParams(filters, {
        page,
        perPage: GOODS_DISPATCHED_PER_PAGE,
      })
      const result =
        goodsDispatchedReportData.report_kind === 'authorized_pending'
          ? await invoiceApi.getAuthorizedPendingDispatchReport(params)
          : await invoiceApi.getGoodsDispatchedReport(params)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setGoodsDispatchedReportData(result.data)
    } finally {
      setGoodsDispatchedReportPaging(false)
    }
  }

  const exportGoodsDispatchedFull = async (kind: 'csv' | 'pdf') => {
    if (!goodsDispatchedReportData || !filters || !isDispatchReleaseReportFilters(filters)) return
    setGoodsDispatchedReportExporting(true)
    try {
      const exportParams = buildDispatchReportQueryParams(filters)
      const result =
        goodsDispatchedReportData.report_kind === 'authorized_pending'
          ? await invoiceApi.getAuthorizedPendingDispatchReport(exportParams)
          : await invoiceApi.getGoodsDispatchedReport(exportParams)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      const exportKey = resolveDispatchReportExportKey(
        selectedReport?.key,
        result.data.report_kind
      )
      if (!exportKey) {
        toast.error('This report cannot be exported.')
        return
      }
      if (kind === 'csv') {
        if (exportKey === 'loan-balance') {
          downloadLoanBalanceReportCsv(result.data)
        } else {
          downloadGoodsDispatchedReportCsv(result.data, exportKey)
        }
      } else if (exportKey === 'loan-balance') {
        printLoanBalanceReportAsPdf(result.data)
      } else {
        printGoodsDispatchedReportAsPdf(result.data, exportKey)
      }
    } finally {
      setGoodsDispatchedReportExporting(false)
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
      case 'goods-dispatched-cash':
      case 'goods-dispatched-loan':
      case 'loan-balance':
      case 'authorized-pending-dispatch': {
        const { dateFrom, dateTo } = getInvoicePaymentRangeForPreset('month')
        const isLoan = type === 'goods-dispatched-loan' || type === 'loan-balance'
        const isCash = type === 'goods-dispatched-cash'
        return {
          datePreset: 'month' as const,
          dateFrom,
          dateTo,
          releaseFilter: isLoan ? 'loan' : isCash ? 'cash' : 'all',
          paidFilter: 'all',
          customerName: '',
          customerCompany: '',
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
      selectedReport.key === 'posted-containers' ||
      selectedReport.key === 'goods-dispatched-cash' ||
      selectedReport.key === 'goods-dispatched-loan' ||
      selectedReport.key === 'loan-balance' ||
      selectedReport.key === 'authorized-pending-dispatch'
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
                selectedReport?.key !== 'goods-dispatched-cash' &&
                selectedReport?.key !== 'goods-dispatched-loan' &&
                selectedReport?.key !== 'loan-balance' &&
                selectedReport?.key !== 'authorized-pending-dispatch' &&
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
                selectedReport?.key === 'posted-containers' ||
                selectedReport?.key === 'goods-dispatched-cash' ||
                selectedReport?.key === 'goods-dispatched-loan' ||
                selectedReport?.key === 'loan-balance' ||
                selectedReport?.key === 'authorized-pending-dispatch') &&
                isDateRangedReportFilters(filters) && (
                  <div className='space-y-3'>
                    <Label>
                      {selectedReport.key === 'invoice-payments'
                        ? 'Payment date range'
                        : selectedReport.key === 'posted-containers'
                          ? 'Posted date range'
                          : selectedReport.key === 'goods-dispatched-cash' ||
                            selectedReport.key === 'goods-dispatched-loan' ||
                            selectedReport.key === 'loan-balance'
                            ? 'Dispatch date range'
                            : selectedReport.key === 'authorized-pending-dispatch'
                              ? 'Authorization date range'
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

              {(selectedReport?.key === 'goods-dispatched-cash' ||
                selectedReport?.key === 'goods-dispatched-loan' ||
                selectedReport?.key === 'loan-balance' ||
                selectedReport?.key === 'authorized-pending-dispatch') &&
                isDispatchReleaseReportFilters(filters) && (
                <div className='space-y-2'>
                  <Label htmlFor='goodsDispatchedRelease'>Dispatch on</Label>
                  <Select
                    value={filters.releaseFilter}
                    onValueChange={(value) => handleFilterChange('releaseFilter', value)}
                    disabled={
                      selectedReport?.key === 'goods-dispatched-cash' ||
                      selectedReport?.key === 'goods-dispatched-loan' ||
                      selectedReport?.key === 'loan-balance'
                    }
                  >
                    <SelectTrigger id='goodsDispatchedRelease'>
                      <SelectValue placeholder='Cash or credit' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Both (cash and credit)</SelectItem>
                      <SelectItem value='cash'>Cash only</SelectItem>
                      <SelectItem value='loan'>Credit only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-xs text-muted-foreground'>
                    Restrict to lines dispatched on cash, on credit (loan), or both.
                  </p>
                </div>
              )}

              {(selectedReport?.key === 'goods-dispatched-loan' ||
                selectedReport?.key === 'loan-balance') &&
                isDispatchReleaseReportFilters(filters) && (
                  <>
                    <div className='space-y-2'>
                      <Label htmlFor='goodsDispatchedPaidFilter'>Payment status</Label>
                      <Select
                        value={filters.paidFilter}
                        onValueChange={(value) => handleFilterChange('paidFilter', value)}
                      >
                        <SelectTrigger id='goodsDispatchedPaidFilter'>
                          <SelectValue placeholder='All loaned goods' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>All loaned goods</SelectItem>
                          <SelectItem value='paid'>Paid in full</SelectItem>
                          <SelectItem value='unpaid'>Not paid in full</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className='text-xs text-muted-foreground'>
                        Filters previously loaned goods by whether the linked invoice is fully paid.
                      </p>
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='goodsDispatchedCustomer'>Customer (optional)</Label>
                      <AsyncSelect<CustomerOption>
                        value={selectedGoodsDispatchedCustomer}
                        onChange={(selected) => {
                          setSelectedGoodsDispatchedCustomer(selected)
                          handleFilterChange('customerName', selected?.name?.trim() || '')
                          handleFilterChange('customerCompany', '')
                        }}
                        loadOptions={loadCmtsReportCustomerOptionsDebounced}
                        placeholder='Type CMTS customer name or phone...'
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
                      />
                      <p className='text-xs text-muted-foreground'>
                        Searches CMTS customers (name, phone, company) — up to 50 matches per search.
                      </p>
                    </div>
                  </>
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
                  setSelectedGoodsDispatchedCustomer(null)
                    setInvoiceReportData(null)
                    setInvoiceReportOpen(false)
                    setPostedContainersReportData(null)
                    setPostedContainersReportOpen(false)
                    setGoodsDispatchedReportData(null)
                    setGoodsDispatchedReportOpen(false)
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
              ) : selectedReport?.key === 'goods-dispatched-cash' ||
                selectedReport?.key === 'goods-dispatched-loan' ||
                selectedReport?.key === 'loan-balance' ? (
                <Button
                  type='button'
                  size='sm'
                  disabled={
                    goodsDispatchedReportSubmitting ||
                    !filters ||
                    !isDispatchReleaseReportFilters(filters) ||
                    !filters.dateFrom ||
                    !filters.dateTo
                  }
                  onClick={() => void submitDispatchReleaseReport('dispatched')}
                >
                  {goodsDispatchedReportSubmitting ? 'Loading…' : 'Submit'}
                </Button>
              ) : selectedReport?.key === 'authorized-pending-dispatch' ? (
                <Button
                  type='button'
                  size='sm'
                  disabled={
                    goodsDispatchedReportSubmitting ||
                    !filters ||
                    !isDispatchReleaseReportFilters(filters) ||
                    !filters.dateFrom ||
                    !filters.dateTo
                  }
                  onClick={() => void submitDispatchReleaseReport('authorized_pending')}
                >
                  {goodsDispatchedReportSubmitting ? 'Loading…' : 'Submit'}
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
              <div className='min-h-0 flex-1 overflow-auto pr-1'>
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
              </div>
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
                      void downloadInvoicePaymentReportPdf(invoicePaymentReportData, loggedInUser?.name)
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

      <Dialog
        open={goodsDispatchedReportOpen}
        onOpenChange={(next) => {
          setGoodsDispatchedReportOpen(next)
          if (!next) setGoodsDispatchedReportData(null)
        }}
      >
        <DialogContent className='flex max-h-[min(90vh,800px)] w-[min(1400px,98vw)] max-w-[min(1400px,98vw)] flex-col gap-0 overflow-hidden sm:max-w-[min(1400px,98vw)]'>
          <DialogHeader className='shrink-0'>
            <DialogTitle>
              {goodsDispatchedReportData?.report_kind === 'authorized_pending'
                ? 'Authorized — not dispatched'
                : selectedReport?.key === 'goods-dispatched-cash'
                  ? 'Goods dispatched on cash'
                  : selectedReport?.key === 'goods-dispatched-loan'
                    ? 'Goods dispatched on loan'
                    : selectedReport?.key === 'loan-balance'
                      ? 'Loan balance'
                    : 'Good dispatched report'}
            </DialogTitle>
          </DialogHeader>
          {goodsDispatchedReportData ? (
            <>
              <p className='text-sm text-muted-foreground shrink-0 pb-2'>
                {goodsDispatchedReportData.date_from} – {goodsDispatchedReportData.date_to}
                <span className='ms-2'>
                  ·{' '}
                  {goodsDispatchedReportData.release === 'cash'
                    ? 'Cash only'
                    : goodsDispatchedReportData.release === 'loan'
                      ? 'Credit only'
                      : 'Cash and credit'}
                </span>
                {goodsDispatchedReportData.payment_status &&
                goodsDispatchedReportData.payment_status !== 'all' ? (
                  <span className='ms-2'>
                    · Payment:{' '}
                    {goodsDispatchedReportData.payment_status === 'paid'
                      ? 'Paid in full'
                      : 'Not paid in full'}
                  </span>
                ) : null}
                <span className='ms-2'>
                  ({goodsDispatchedReportData.summary.row_count}{' '}
                  {goodsDispatchedReportData.summary.row_count === 1 ? 'line' : 'lines'}
                  {goodsDispatchedReportData.pagination
                    ? ` · showing ${goodsDispatchedReportData.pagination.from ?? 0}–${
                        goodsDispatchedReportData.pagination.to ?? 0
                      }`
                    : ''}
                  )
                </span>
              </p>
              {goodsDispatchedReportData.pagination ? (
                <div className='flex shrink-0 flex-wrap items-center justify-between gap-2 border-b pb-2'>
                  <p className='text-muted-foreground text-xs'>
                    Page {goodsDispatchedReportData.pagination.current_page} of{' '}
                    {goodsDispatchedReportData.pagination.last_page}
                  </p>
                  <div className='flex items-center gap-1'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={
                        goodsDispatchedReportPaging ||
                        goodsDispatchedReportData.pagination.current_page <= 1
                      }
                      onClick={() =>
                        void fetchGoodsDispatchedReportPage(
                          goodsDispatchedReportData.pagination!.current_page - 1
                        )
                      }
                    >
                      <ChevronLeft className='h-4 w-4' />
                      Previous
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={
                        goodsDispatchedReportPaging ||
                        goodsDispatchedReportData.pagination.current_page >=
                          goodsDispatchedReportData.pagination.last_page
                      }
                      onClick={() =>
                        void fetchGoodsDispatchedReportPage(
                          goodsDispatchedReportData.pagination!.current_page + 1
                        )
                      }
                    >
                      Next
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ) : null}
              <p className='text-xs text-muted-foreground shrink-0 pb-2'>
                Cash {goodsDispatchedReportData.summary.cash_rows} · Credit (loan){' '}
                {goodsDispatchedReportData.summary.loan_rows} · Paid in full{' '}
                {goodsDispatchedReportData.summary.paid_rows} · Not paid in full{' '}
                {goodsDispatchedReportData.summary.unpaid_rows}
                <br />
                Credit dispatch · invoice now paid in full{' '}
                {goodsDispatchedReportData.summary.credit_dispatch_paid_rows} · still outstanding{' '}
                {goodsDispatchedReportData.summary.credit_dispatch_unpaid_rows}
                {goodsDispatchedReportData.report_kind === 'authorized_pending' ? (
                  <>
                    <br />
                    Longest wait {goodsDispatchedReportData.summary.max_days_pending ?? 0} day(s)
                    · average {goodsDispatchedReportData.summary.avg_days_pending ?? 0} day(s)
                  </>
                ) : null}
              </p>
              <div className='min-h-0 flex-1 overflow-auto pr-1'>
                <div className='space-y-4 pb-4'>
                  <div className='overflow-x-auto'>
                    {goodsDispatchedReportPaging ? (
                      <p className='text-muted-foreground py-2 text-center text-xs'>Loading page…</p>
                    ) : null}
                    <Table>
                      {selectedReport?.key === 'loan-balance' ? (
                        <>
                          <TableHeader>
                            <TableRow>
                              <TableHead className='min-w-[130px]'>Date</TableHead>
                              <TableHead className='min-w-[200px]'>Customer Name</TableHead>
                              <TableHead className='min-w-[140px]'>Container Number</TableHead>
                              <TableHead className='min-w-[100px]'>Goods Pkgs</TableHead>
                              <TableHead className='min-w-[120px]'>Invoice No</TableHead>
                              <TableHead className='min-w-[120px] text-right'>Invoice Amount</TableHead>
                              <TableHead className='min-w-[120px] text-right'>Discount Amount</TableHead>
                              <TableHead className='min-w-[120px] text-right'>Paid Amount</TableHead>
                              <TableHead className='min-w-[120px] text-right'>Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {goodsDispatchedReportData.rows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className='text-center text-muted-foreground'>
                                  No loan balance rows in this range.
                                </TableCell>
                              </TableRow>
                            ) : (
                              goodsDispatchedReportData.rows.map((r) => (
                                <TableRow key={r.id}>
                                  <TableCell className='tabular-nums'>
                                    {formatGoodsDispatchedAt(r.dispatched_at)}
                                  </TableCell>
                                  <TableCell>{r.customer_name || '—'}</TableCell>
                                  <TableCell>{r.container_no || '—'}</TableCell>
                                  <TableCell className='tabular-nums'>
                                    {r.pkgs != null ? r.pkgs : '—'}
                                  </TableCell>
                                  <TableCell>{r.invoice_no || '—'}</TableCell>
                                  <TableCell className='text-right tabular-nums'>
                                    {r.bill_amount != null ? r.bill_amount : '—'}
                                  </TableCell>
                                  <TableCell className='text-right tabular-nums'>
                                    {r.bill_discount_amount != null ? r.bill_discount_amount : '—'}
                                  </TableCell>
                                  <TableCell className='text-right tabular-nums'>
                                    {r.bill_paid_amount != null ? r.bill_paid_amount : '—'}
                                  </TableCell>
                                  <TableCell className='text-right tabular-nums'>
                                    {r.bill_balance != null ? r.bill_balance : '—'}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </>
                      ) : (
                        <>
                          <TableHeader>
                            <TableRow>
                              <TableHead className='min-w-[140px]'>
                                {goodsDispatchedReportData.report_kind === 'authorized_pending'
                                  ? 'Authorization'
                                  : 'Dispatch'}
                              </TableHead>
                              <TableHead className='min-w-[160px]'>Customer</TableHead>
                              <TableHead className='min-w-[220px]'>Consignment</TableHead>
                              <TableHead className='min-w-[140px]'>Pickup / vehicle</TableHead>
                              <TableHead className='min-w-[200px]'>Goods (line)</TableHead>
                              <TableHead className='min-w-[180px]'>Billing</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {goodsDispatchedReportData.rows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className='text-center text-muted-foreground'>
                                  {goodsDispatchedReportData.report_kind === 'authorized_pending'
                                    ? 'No authorized goods awaiting pickup in this range.'
                                    : 'No dispatched goods in this range.'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              goodsDispatchedReportData.rows.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div className='tabular-nums whitespace-nowrap'>
                                  {goodsDispatchedReportData.report_kind === 'authorized_pending'
                                    ? formatGoodsDispatchedAt(r.authorized_at ?? null)
                                    : formatGoodsDispatchedAt(r.dispatched_at)}
                                </div>
                                {goodsDispatchedReportData.report_kind === 'authorized_pending' &&
                                r.days_pending != null ? (
                                  <div className='mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-400'>
                                    {r.days_pending} day{r.days_pending === 1 ? '' : 's'} waiting
                                  </div>
                                ) : null}
                                <div className='mt-1 font-mono text-xs text-muted-foreground'>
                                  {r.dispatch_reference || '—'}
                                </div>
                                {goodsDispatchedReportData.report_kind === 'authorized_pending' &&
                                r.authorized_by_name ? (
                                  <div className='mt-1 text-xs text-muted-foreground'>
                                    Authorized by {r.authorized_by_name}
                                  </div>
                                ) : r.dispatched_by_name ? (
                                  <div className='mt-1 text-xs text-muted-foreground'>
                                    By {r.dispatched_by_name}
                                  </div>
                                ) : null}
                                <div className='mt-1 text-xs capitalize text-muted-foreground'>
                                  {r.release_type === 'loan' ? 'Credit' : 'Cash'}
                                </div>
                              </TableCell>
                              <TableCell className='align-top whitespace-normal'>
                                <div className='font-medium'>{r.customer_name || '—'}</div>
                                {r.customer_company_name ? (
                                  <div className='mt-0.5 text-sm text-muted-foreground'>
                                    {r.customer_company_name}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div>{r.consignment_name || '—'}</div>
                                <div className='mt-0.5 tabular-nums text-muted-foreground'>
                                  {r.consignment_tracking || '—'}
                                </div>
                                {r.consignment_label ? (
                                  <div className='mt-0.5 text-muted-foreground'>
                                    Label: {r.consignment_label}
                                  </div>
                                ) : null}
                                <div className='mt-1 text-xs text-muted-foreground'>
                                  {[
                                    r.consignment_pkgs != null
                                      ? `${r.consignment_pkgs} ctn pkg`
                                      : null,
                                    r.consignment_cbm != null ? `CBM ${r.consignment_cbm}` : null,
                                    r.container_no ? `Cont. ${r.container_no}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || '—'}
                                </div>
                              </TableCell>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div>{r.pickup_by || '—'}</div>
                                {r.pickup_cellphone ? (
                                  <div className='mt-0.5 tabular-nums text-muted-foreground'>
                                    {r.pickup_cellphone}
                                  </div>
                                ) : null}
                                {r.pickup_vehicle ? (
                                  <div className='mt-0.5 font-mono text-xs text-muted-foreground'>
                                    {r.pickup_vehicle}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div className='font-medium'>{r.good_name || '—'}</div>
                                {r.good_supplier_receipt ? (
                                  <div className='mt-0.5 text-xs text-muted-foreground'>
                                    Receipt: {r.good_supplier_receipt}
                                  </div>
                                ) : null}
                                <div className='mt-1 tabular-nums text-muted-foreground'>
                                  Qty {r.quantity != null ? r.quantity : '—'} · Pkgs{' '}
                                  {r.pkgs != null ? r.pkgs : '—'} · {r.unit ?? '—'}
                                </div>
                              </TableCell>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div className='font-medium leading-snug'>{r.credit_dispatch_note}</div>
                                <div className='mt-2 tabular-nums'>Invoice: {r.invoice_no ?? '—'}</div>
                                <div className='mt-1'>
                                  Paid in full:{' '}
                                  <span className='font-medium'>
                                    {r.bill_fully_paid ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                <div className='mt-0.5 tabular-nums text-muted-foreground'>
                                  Balance: {r.bill_balance != null ? r.bill_balance : '—'}
                                </div>
                                {r.bill_status ? (
                                  <div className='mt-1 text-xs text-muted-foreground'>
                                    {r.bill_status}
                                  </div>
                                ) : null}
                              </TableCell>
                              </TableRow>
                            ))
                          )}
                          </TableBody>
                        </>
                      )}
                    </Table>
                  </div>
                </div>
              </div>
              <DialogFooter className='mt-4 shrink-0 flex-row justify-end gap-2 border-t pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={goodsDispatchedReportExporting}
                  onClick={() => void exportGoodsDispatchedFull('csv')}
                >
                  <Download className='mr-2 h-4 w-4' />
                  {goodsDispatchedReportExporting ? 'Preparing…' : 'Excel'}
                </Button>
                <Button
                  type='button'
                  size='sm'
                  disabled={goodsDispatchedReportExporting}
                  onClick={() => void exportGoodsDispatchedFull('pdf')}
                >
                  <Download className='mr-2 h-4 w-4' />
                  {goodsDispatchedReportExporting ? 'Preparing…' : 'PDF'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

