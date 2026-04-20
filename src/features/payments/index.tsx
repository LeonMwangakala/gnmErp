import { useState, useEffect, useRef } from 'react'
import {
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Wrench,
  RefreshCw,
  Trash2,
  Info,
  Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { invoiceApi, paymentApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AddPaymentModal } from './add-payment-modal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InvoiceConsignmentsGoodsModal } from '@/features/invoices/invoice-consignments-goods-modal'

export interface Payment {
  id: number
  invoice_id: number
  customer_name?: string
  invoice_number: string
  invoice_amount?: number
  invoice_amount_formatted?: string
  invoice_status?: number
  invoice_status_label?: string
  date: string
  date_raw: string
  amount: number
  amount_formatted: string
  amount_usd?: number
  amount_usd_formatted?: string
  payment_type: string
  payment_method: string
  account_id: number | null
  account_name: string
  reference: string
  description: string
  receipt: string
  receipt_url: string | null
  currency_id?: number | null
  currency_exchange_rate?: number | string | null
  invoice_currency_exchange_rate?: number | string | null
  currency_code?: string | null
  currency_symbol?: string | null
  cmts_sync_status?: 'pending' | 'success' | 'failed' | string
}

function paymentSlipLogoUrl(): string {
  if (typeof window === 'undefined') return '/images/gnm_cargo.png'
  return `${window.location.origin}/images/gnm_cargo.png`
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPaymentSlipHtml(viewPayment: Payment, slipConsignments: any[]): string {
  const logoUrl = paymentSlipLogoUrl()

  const consignmentsSection =
    slipConsignments.length === 0
      ? '<p class="empty-note">No consignment line items on file for this slip.</p>'
      : slipConsignments
          .map((block: any) => {
            const consignment = block?.consignment || {}
            const lines = Array.isArray(block?.good_consignments) ? block.good_consignments : []
            const rows = lines
              .map(
                (line: any) => `<tr>
                  <td>${escapeHtml(line?.good?.name) || '—'}</td>
                  <td class="num">${escapeHtml(line?.quantity) || '—'}</td>
                  <td class="num">${escapeHtml(line?.pkgs) || '—'}</td>
                  <td>${escapeHtml(line?.unit) || '—'}</td>
                </tr>`
              )
              .join('')

            const tracking = escapeHtml(consignment?.tracking_number) || '—'
            return `<div class="consignment-card">
              <div class="consignment-card__head">Consignment ${tracking}</div>
              <table class="line-table" role="grid">
                <thead>
                  <tr>
                    <th scope="col">Good</th>
                    <th scope="col" class="num">Qty</th>
                    <th scope="col" class="num">Pkgs</th>
                    <th scope="col">Unit</th>
                  </tr>
                </thead>
                <tbody>${
                  rows ||
                  '<tr><td colspan="4" class="muted-cell">No goods listed</td></tr>'
                }</tbody>
              </table>
            </div>`
          })
          .join('')

  const descriptionNote =
    viewPayment.description?.trim() !== ''
      ? `<div class="description-box">
          <div class="description-box__label">Notes</div>
          <div class="description-box__text">${escapeHtml(viewPayment.description)}</div>
        </div>`
      : ''

  const inv = escapeHtml(viewPayment.invoice_number)
  const customer = escapeHtml(viewPayment.customer_name) || '—'
  const paidDate = escapeHtml(viewPayment.date)
  const amount = escapeHtml(viewPayment.amount_formatted)
  const invTotalDisplay =
    viewPayment.invoice_amount_formatted?.trim() !== ''
      ? escapeHtml(viewPayment.invoice_amount_formatted)
      : '—'
  const referenceDisplay =
    viewPayment.reference?.trim() !== ''
      ? escapeHtml(viewPayment.reference)
      : '—'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment receipt — ${inv}</title>
  <style>
    /* Layout tuned for 58mm thermal paper (~54mm printable width). */
    * { box-sizing: border-box; }
    html {
      -webkit-print-color-adjust: economy;
      print-color-adjust: economy;
    }
    body {
      margin: 0;
      padding: 6px 3px 8px;
      font-family: Arial, Helvetica, ui-sans-serif, system-ui, sans-serif;
      font-size: 8.5pt;
      line-height: 1.25;
      color: #000;
      background: #fff;
    }
    .sheet {
      width: 100%;
      max-width: 54mm;
      margin: 0 auto;
      border: 1px solid #000;
      padding: 0;
    }
    .doc-header {
      text-align: center;
      padding: 8px 6px 6px;
      border-bottom: 1px solid #000;
    }
    .doc-header img {
      width: 32px;
      height: 32px;
      object-fit: contain;
      margin: 0 auto 4px;
      display: block;
      image-rendering: auto;
      filter: grayscale(100%);
    }
    .doc-title {
      margin: 0;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .kv-table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      font-size: 7.5pt;
    }
    .kv-table th,
    .kv-table td {
      border: 1px solid #000;
      padding: 3px 3px;
      vertical-align: top;
      text-align: left;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .kv-table th {
      width: 34%;
      font-weight: 700;
      background: #fff;
    }
    .amount-row td {
      font-weight: 700;
      font-size: 8.5pt;
    }
    .amount-row .amt {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .section-head {
      margin: 0;
      padding: 4px 4px 3px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #000;
    }
    .section-body {
      padding: 4px 3px 5px;
    }
    .empty-note {
      margin: 0;
      padding: 6px 4px;
      border: 1px dashed #000;
      font-size: 7.5pt;
      text-align: center;
      word-wrap: break-word;
    }
    .consignment-card {
      margin-bottom: 5px;
      border: 1px solid #000;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .consignment-card:last-child { margin-bottom: 0; }
    .consignment-card__head {
      padding: 3px 3px;
      font-size: 7pt;
      font-weight: 700;
      border-bottom: 1px solid #000;
      word-wrap: break-word;
    }
    .line-table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      font-size: 6.8pt;
    }
    .line-table th,
    .line-table td {
      border: 1px solid #000;
      padding: 2px 2px;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .line-table th {
      font-weight: 700;
      text-align: left;
      background: #fff;
    }
    .line-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .line-table th.num { text-align: right; }
    .muted-cell {
      font-style: italic;
      text-align: center;
      color: #000;
    }
    .description-box {
      margin: 0;
      padding: 4px 4px;
      border-top: 1px solid #000;
      font-size: 7.2pt;
    }
    .description-box__label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 2px;
    }
    .description-box__text {
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .doc-footer {
      text-align: center;
      padding: 4px 3px 5px;
      border-top: 1px solid #000;
      font-size: 6.5pt;
      color: #000;
    }
    .doc-footer strong {
      display: block;
      font-size: 7pt;
      margin-bottom: 4px;
    }
    .doc-footer__meta {
      margin: 0 0 3px;
      font-size: 6.2pt;
      line-height: 1.35;
    }
    .doc-footer__credit {
      display: block;
      margin-top: 4px;
      font-size: 6.2pt;
    }
    @page {
      size: 58mm auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: 54mm;
        max-width: 54mm;
        margin: 0 auto;
        padding: 1mm 1mm 1.5mm;
        font-size: 8pt;
      }
      .sheet {
        width: 54mm;
        max-width: 54mm;
        border: none;
        margin: 0;
      }
      .doc-header img {
        width: 28px;
        height: 28px;
        filter: none;
      }
      .doc-title { font-size: 8pt; }
      .kv-table { font-size: 7pt; }
      .kv-table th,
      .kv-table td { padding: 2px 2px; }
      .amount-row td { font-size: 8pt; }
      .line-table { font-size: 6.5pt; }
      .line-table th,
      .line-table td { padding: 1px 2px; }
    }
  </style>
</head>
<body class="thermal-receipt">
  <div class="sheet">
    <header class="doc-header">
      <img src="${logoUrl}" alt="" width="44" height="44" />
      <h1 class="doc-title">Payment receipt</h1>
    </header>

    <table class="kv-table">
      <tbody>
        <tr><th scope="row">Customer</th><td>${customer}</td></tr>
        <tr><th scope="row">Date</th><td>${paidDate}</td></tr>
        <tr><th scope="row">Amount</th><td>${invTotalDisplay}</td></tr>
        <tr><th scope="row">Reference</th><td>${referenceDisplay}</td></tr>
        <tr class="amount-row"><th scope="row">Paid</th><td class="amt">${amount}</td></tr>
      </tbody>
    </table>

    ${descriptionNote}

    <h2 class="section-head">Consignment details</h2>
    <div class="section-body">${consignmentsSection}</div>

    <footer class="doc-footer">
      <strong>GNM CARGO · #JABALILABAHARI</strong>
      <p class="doc-footer__meta">Warehouse Address: 35 Keko Magurumbasi B</p>
      <p class="doc-footer__meta">Phone: +255674066253</p>
      <span class="doc-footer__credit">Powered by Torchlight</span>
    </footer>
  </div>
</body>
</html>`
}

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [exportDate, setExportDate] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`
  })
  const [isExporting, setIsExporting] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [isSyncingPaymentId, setIsSyncingPaymentId] = useState<number | null>(null)
  const [isDeletingPaymentId, setIsDeletingPaymentId] = useState<number | null>(null)
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null)
  const [viewPayment, setViewPayment] = useState<Payment | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false)
  const [slipHtml, setSlipHtml] = useState('')
  const slipIframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoadingSlipDetails, setIsLoadingSlipDetails] = useState(false)
  const [slipConsignments, setSlipConsignments] = useState<any[]>([])
  const [isConsignmentModalOpen, setIsConsignmentModalOpen] = useState(false)
  const [consignmentInvoiceNo, setConsignmentInvoiceNo] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  })
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchInput, setSearchInput] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput)
        setPagination((prev) => ({ ...prev, current_page: 1 }))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput, search])

  // Fetch payments when pagination, sort, or search changes
  useEffect(() => {
    fetchPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, sortBy, sortOrder, search])

  const fetchPayments = async (
    page?: number,
    perPage?: number,
    searchTerm?: string
  ) => {
    try {
      setIsLoading(true)
      const currentPage = page ?? pagination.current_page
      const currentPerPage = perPage ?? pagination.per_page
      const currentSearch = searchTerm ?? search

      const response = await paymentApi.getPayments({
        page: currentPage,
        per_page: currentPerPage,
        search: currentSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setPayments(response.data)
      setPagination({
        current_page: Number(response.pagination?.current_page ?? 1),
        per_page: Number(response.pagination?.per_page ?? currentPerPage),
        total: Number(response.pagination?.total ?? 0),
        last_page: Number(response.pagination?.last_page ?? 1),
        from: response.pagination?.from ?? null,
        to: response.pagination?.to ?? null,
      })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      setPagination((prev) => ({ ...prev, current_page: newPage }))
    }
  }

  const handlePerPageChange = (newPerPage: number) => {
    setPagination((prev) => ({ ...prev, per_page: newPerPage, current_page: 1 }))
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? '↑' : '↓'
    }
    return null
  }

  const handleDownloadReceipt = (receiptUrl: string | null) => {
    if (receiptUrl) {
      const link = document.createElement('a')
      link.href = receiptUrl
      link.download = ''
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      toast.info('No receipt available')
    }
  }

  const handleOpenPaymentDetails = async (payment: Payment) => {
    setViewPayment(payment)
    setIsViewModalOpen(true)
    setSlipConsignments([])
    try {
      setIsLoadingSlipDetails(true)
      const response = await invoiceApi.getInvoiceConsignmentsGoods(payment.invoice_number)
      const consignments = Array.isArray(response?.consignments) ? response.consignments : []
      setSlipConsignments(consignments)
    } catch {
      setSlipConsignments([])
    } finally {
      setIsLoadingSlipDetails(false)
    }
  }

  const handleOpenPaymentSlipModal = () => {
    if (!viewPayment) return
    setSlipHtml(buildPaymentSlipHtml(viewPayment, slipConsignments))
    setIsSlipModalOpen(true)
  }

  const handlePrintPaymentSlip = () => {
    const win = slipIframeRef.current?.contentWindow
    if (!win) {
      toast.error('Slip preview is not ready yet.')
      return
    }
    win.focus()
    win.print()
  }

  const getCmtsSyncBadgeVariant = (status?: string): 'default' | 'destructive' | 'secondary' => {
    const normalized = (status || 'pending').toLowerCase()
    if (normalized === 'success') return 'default'
    if (normalized === 'failed') return 'destructive'
    return 'secondary'
  }

  const handleExportByDate = async () => {
    if (!exportDate) return
    let success = false
    try {
      setIsExporting(true)
      const blob = await paymentApi.exportInvoicePaymentsByDate(exportDate)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-payments-${exportDate}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      success = true
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to export payments')
    } finally {
      setIsExporting(false)
      if (success) {
        setIsExportModalOpen(false)
      }
    }
  }

  const handleFixInvoicePayments = async (invoiceNumber: string) => {
    const number = invoiceNumber.trim()
    if (!number) {
      toast.error('Invoice number is required')
      return
    }
    const confirmed = window.confirm(`Fix duplicate/malformed payments for invoice ${number}?`)
    if (!confirmed) return

    try {
      setIsFixing(true)
      const response = await paymentApi.fixInvoicePayments(number)
      if (response?.status === 200) {
        const deleted = response?.data?.deleted ?? 0
        const updated = response?.data?.updated_amount_usd ?? 0
        toast.success(
          `${response?.message || 'Invoice payments fixed.'} Deleted: ${deleted}, updated USD: ${updated}.`
        )
        fetchPayments(1, pagination.per_page, search)
      } else {
        toast.error(response?.message || 'Failed to fix invoice payments')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to fix invoice payments')
    } finally {
      setIsFixing(false)
    }
  }

  const handleDeletePayment = async (payment: Payment) => {
    try {
      setIsDeletingPaymentId(payment.id)
      const response = await paymentApi.deletePayment(payment.id)
      if (response?.status === 200) {
        toast.success(response?.message || 'Payment deleted successfully.')
        setPaymentToDelete(null)
        fetchPayments(1, pagination.per_page, search)
      } else {
        toast.error(response?.message || 'Failed to delete payment')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete payment')
    } finally {
      setIsDeletingPaymentId(null)
    }
  }

  const handleSyncPaymentToCmts = async (payment: Payment) => {
    try {
      setIsSyncingPaymentId(payment.id)
      const response = await paymentApi.syncPaymentToCmts(payment.id)
      if (response?.status === 200) {
        toast.success(response?.message || 'CMTS sync successful.')
      } else {
        toast.error(response?.message || 'CMTS sync failed.')
      }
      fetchPayments(pagination.current_page, pagination.per_page, search)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'CMTS sync failed.')
    } finally {
      setIsSyncingPaymentId(null)
    }
  }

  return (
    <>
      <Header showSidebarTrigger={false}>
        <div className='flex items-center justify-between w-full'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Receive Payments</h1>
            <p className='text-muted-foreground'>
              Manage invoice payments and receipts
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Input
              placeholder='Search payments...'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className='max-w-sm'
            />
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsExportModalOpen(true)}
                disabled={isExporting}
              >
                <Download className='mr-2 h-4 w-4' />
                Export
              </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Payment
            </Button>
          </div>
        </div>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Payment List</CardTitle>
            <CardDescription>
              View and manage all invoice payments
              {pagination.total > 0 && (
                <span className='ml-2'>
                  ({pagination.from}-{pagination.to} of {pagination.total})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            ) : payments.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                No payments found
              </div>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S/N</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('invoice_number')}
                      >
                        Invoice Number {renderSortIcon('invoice_number')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted text-right'
                        onClick={() => handleSort('invoice_amount')}
                      >
                        Invoice Amount {renderSortIcon('invoice_amount')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted text-right'
                        onClick={() => handleSort('amount')}
                      >
                        Paid Amount {renderSortIcon('amount')}
                      </TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CMTS Sync</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </TableCell>
                        <TableCell>{payment.customer_name || '--'}</TableCell>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <FileText className='h-4 w-4 text-muted-foreground' />
                            {payment.invoice_number}
                          </div>
                        </TableCell>
                        <TableCell className='text-right'>
                          {payment.invoice_amount_formatted || '-'}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex flex-col items-end'>
                            <span>{payment.amount_formatted}</span>
                            {payment.amount_usd_formatted ? (
                              <span className='text-xs text-muted-foreground'>
                                USD: {payment.amount_usd_formatted}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{payment.account_name}</TableCell>
                        <TableCell>{payment.invoice_status_label || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getCmtsSyncBadgeVariant(payment.cmts_sync_status)}>
                            {payment.cmts_sync_status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                              onClick={() => void handleOpenPaymentDetails(payment)}
                              title='View'
                            >
                              <Eye className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                              onClick={() => void handleFixInvoicePayments(payment.invoice_number)}
                              title='Fix'
                              disabled={isFixing}
                            >
                              <Wrench className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0 text-destructive'
                              onClick={() => setPaymentToDelete(payment)}
                              title='Delete'
                              disabled={isDeletingPaymentId === payment.id}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                              onClick={() => void handleSyncPaymentToCmts(payment)}
                              title='Sync CMTS'
                              disabled={isSyncingPaymentId === payment.id}
                            >
                              <RefreshCw
                                className={`h-4 w-4 ${isSyncingPaymentId === payment.id ? 'animate-spin' : ''}`}
                              />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                              onClick={() => {
                                setConsignmentInvoiceNo(payment.invoice_number)
                                setIsConsignmentModalOpen(true)
                              }}
                              title='Consignment & Goods details'
                            >
                              <Info className='h-4 w-4' />
                            </Button>
                            {payment.receipt_url ? (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 w-8 p-0'
                                onClick={() => handleDownloadReceipt(payment.receipt_url)}
                                title='Download Receipt'
                              >
                                <Download className='h-4 w-4' />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && pagination.total > 0 && (
              <div className='flex items-center justify-between mt-4 pt-4 border-t'>
                <div className='text-sm text-muted-foreground'>
                  Showing {pagination.from} to {pagination.to} of {pagination.total} payments
                </div>
                <div className='flex items-center gap-2'>
                  <Select
                    value={String(pagination.per_page)}
                    onValueChange={(value) => handlePerPageChange(Number(value))}
                  >
                    <SelectTrigger className='h-8 w-[100px]'>
                      <SelectValue placeholder='Per Page' />
                    </SelectTrigger>
                    <SelectContent side='top'>
                      {[10, 15, 25, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={String(pageSize)}>
                          {pageSize} per page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                  >
                    <ChevronLeft className='h-4 w-4' />
                    Previous
                  </Button>
                  <div className='flex items-center gap-1'>
                    {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <Button
                          key={pageNum}
                          variant={
                            pagination.current_page === pageNum ? 'default' : 'outline'
                          }
                          size='sm'
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                  >
                    Next
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>

      <AddPaymentModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          // Refresh payments after a successful create
          fetchPayments(1, pagination.per_page, search)
        }}
      />

      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className='w-[92vw] max-w-[320px]'>
          <DialogHeader>
            <DialogTitle>Export Payments</DialogTitle>
          </DialogHeader>

          <div className='space-y-2'>
            <label className='block text-sm font-medium'>
              Select date <span className='text-destructive'>*</span>
            </label>
            <Input
              type='date'
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
              disabled={isExporting}
            />
          </div>

          <div className='flex justify-end gap-2 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsExportModalOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => void handleExportByDate()}
              disabled={isExporting || !exportDate}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InvoiceConsignmentsGoodsModal
        open={isConsignmentModalOpen}
        onOpenChange={setIsConsignmentModalOpen}
        invoiceNo={consignmentInvoiceNo}
      />

      <Dialog
        open={isViewModalOpen}
        onOpenChange={(open) => {
          setIsViewModalOpen(open)
          if (!open) {
            setIsSlipModalOpen(false)
            setSlipHtml('')
          }
        }}
      >
        <DialogContent className='w-[92vw] max-w-[540px]'>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='space-y-1'>
              <label className='text-sm font-medium'>Customer</label>
              <Input value={viewPayment?.customer_name || '-'} disabled />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium'>Invoice Number</label>
              <Input value={viewPayment?.invoice_number || '-'} disabled />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium'>Invoice Amount</label>
              <Input value={viewPayment?.invoice_amount_formatted || '-'} disabled />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium'>Paid Amount</label>
              <Input value={viewPayment?.amount_formatted || '-'} disabled />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium'>Account</label>
              <Input value={viewPayment?.account_name || '-'} disabled />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium'>Date</label>
              <Input value={viewPayment?.date || '-'} disabled />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium'>Exchange Rate</label>
              <Input
                value={
                  String(
                    viewPayment?.currency_exchange_rate ??
                      viewPayment?.invoice_currency_exchange_rate ??
                      '-'
                  )
                }
                disabled
              />
            </div>
            <div className='space-y-1'>
              <label className='text-sm font-medium'>Status</label>
              <Input value={viewPayment?.invoice_status_label || '-'} disabled />
            </div>
          </div>
          <div className='flex justify-between items-center pt-2'>
            <span className='text-xs text-muted-foreground'>
              {isLoadingSlipDetails ? 'Loading consignment details...' : `${slipConsignments.length} consignments loaded`}
            </span>
            <Button
              type='button'
              onClick={handleOpenPaymentSlipModal}
              disabled={!viewPayment || isLoadingSlipDetails}
            >
              <FileText className='mr-2 h-4 w-4' />
              Payment slip
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSlipModalOpen}
        onOpenChange={(open) => {
          setIsSlipModalOpen(open)
          if (!open) setSlipHtml('')
        }}
      >
        <DialogContent className='flex max-h-[90vh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[90vh]'>
          <DialogHeader className='shrink-0 border-b px-6 py-4 pr-14 text-left'>
            <DialogTitle>Payment slip</DialogTitle>
          </DialogHeader>
          <div className='min-h-0 flex-1 overflow-auto bg-muted/40 px-4 py-3'>
            {slipHtml ? (
              <iframe
                ref={slipIframeRef}
                title='Payment slip'
                srcDoc={slipHtml}
                className='h-[min(65vh,520px)] w-full rounded-md border bg-white shadow-sm'
              />
            ) : null}
          </div>
          <div className='flex shrink-0 justify-end gap-2 border-t px-6 py-4'>
            <Button type='button' variant='outline' onClick={() => setIsSlipModalOpen(false)}>
              Close
            </Button>
            <Button type='button' onClick={handlePrintPaymentSlip} disabled={!slipHtml}>
              <Printer className='mr-2 h-4 w-4' />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(paymentToDelete)}
        onOpenChange={(open) => {
          if (!open && isDeletingPaymentId === null) {
            setPaymentToDelete(null)
          }
        }}
      >
        <DialogContent className='w-[92vw] max-w-[320px]'>
          <DialogHeader>
            <DialogTitle>Confirm Delete Payment</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            Delete payment for invoice{' '}
            <span className='font-medium text-foreground'>
              {paymentToDelete?.invoice_number || '-'}
            </span>
            ? This will adjust customer and bank balances.
          </p>
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setPaymentToDelete(null)}
              disabled={isDeletingPaymentId !== null}
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={() => paymentToDelete && void handleDeletePayment(paymentToDelete)}
              disabled={isDeletingPaymentId !== null}
            >
              {isDeletingPaymentId !== null ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
