import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { format, parseISO } from 'date-fns'
import { customerApi, invoiceApi, PaginationMeta, type GoodsDispatchedReportData, type GoodsDispatchedReportRow } from '@/lib/api'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { EMPTY_INVOICE_REFS, useInvoiceContainers } from './use-invoice-containers'
import { InvoiceConsignmentsGoodsModal } from '@/features/invoices/invoice-consignments-goods-modal'

function defaultDispatchDateRange() {
  const to = new Date()
  const from = new Date()
  from.setFullYear(from.getFullYear() - 1)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function formatGoodsDispatchedAt(iso: string | null) {
  if (!iso) return '—'
  try {
    const d = parseISO(iso)
    if (Number.isNaN(d.getTime())) return iso
    return format(d, 'yyyy-MM-dd HH:mm')
  } catch {
    return iso
  }
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, '')
}

interface CustomerDetail {
  id: number
  customer_number: string
  name: string
  short_name: string
  email: string
  contact: string
  tax_number: string
  vrn: string
  balance: number
  balance_formatted: string
  created_at: string
  billing: {
    name: string
    phone: string
    country: string
    state: string
    city: string
    zip: string
    address: string
  }
  shipping: {
    name: string
    phone: string
    country: string
    state: string
    city: string
    zip: string
    address: string
  }
  statistics: {
    total_invoice_sum: number
    total_invoice_sum_formatted: string
    total_invoice_count: number
    average_sale: number
    average_sale_formatted: string
    overdue: number
    overdue_formatted: string
  }
}

interface Invoice {
  id: number
  invoice_number: string
  ref_number: string
  customer_name: string
  issue_date: string
  due_date: string
  due_date_raw: string
  is_overdue: boolean
  total_tax: number
  total_tax_formatted: string
  amount: number
  amount_formatted: string
  paid_amount?: number
  paid_amount_formatted?: string
  due_amount: number
  due_amount_formatted: string
  status: number
  status_label: string
}

interface CustomerDetailModalProps {
  customerId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailModal({
  customerId,
  open,
  onOpenChange,
}: CustomerDetailModalProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  })
  const [activeTab, setActiveTab] = useState('info')
  const [cargoModalOpen, setCargoModalOpen] = useState(false)
  const [cargoInvoiceNo, setCargoInvoiceNo] = useState<string | null>(null)

  const [dispatchDateFrom, setDispatchDateFrom] = useState(() => defaultDispatchDateRange().from)
  const [dispatchDateTo, setDispatchDateTo] = useState(() => defaultDispatchDateRange().to)
  const [dispatchRows, setDispatchRows] = useState<GoodsDispatchedReportRow[]>([])
  const [dispatchSummary, setDispatchSummary] = useState<GoodsDispatchedReportData['summary'] | null>(null)
  const [dispatchLoading, setDispatchLoading] = useState(false)

  const { containerByInvoiceId, containersLoading } = useInvoiceContainers(
    activeTab === 'invoices' ? invoices : EMPTY_INVOICE_REFS
  )

  useEffect(() => {
    if (open && customerId) {
      fetchCustomer()
      setActiveTab('info')
    } else {
      // Reset state when modal closes
      setCustomer(null)
      setInvoices([])
      setPagination({
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      })
      const r = defaultDispatchDateRange()
      setDispatchDateFrom(r.from)
      setDispatchDateTo(r.to)
      setDispatchRows([])
      setDispatchSummary(null)
    }
  }, [open, customerId])

  const loadDispatches = useCallback(async () => {
    if (!customer) return
    setDispatchLoading(true)
    setDispatchSummary(null)
    try {
      const phoneDigits = digitsOnly(customer.contact || '')
      const nm = (customer.name || '').trim()
      const res = await invoiceApi.getGoodsDispatchedReport({
        date_from: dispatchDateFrom,
        date_to: dispatchDateTo,
        release: 'all',
        customer_email: customer.email?.trim() || undefined,
        customer_phone: phoneDigits.length >= 9 ? phoneDigits : undefined,
        customer_tax_id: customer.tax_number?.trim() || undefined,
        customer_name: nm.length >= 2 ? nm : undefined,
      })
      if (res.ok) {
        setDispatchRows(res.data.rows)
        setDispatchSummary(res.data.summary)
      } else {
        setDispatchRows([])
        setDispatchSummary(null)
        toast.error(res.message)
      }
    } catch {
      setDispatchRows([])
      setDispatchSummary(null)
    } finally {
      setDispatchLoading(false)
    }
  }, [customer, dispatchDateFrom, dispatchDateTo])

  useEffect(() => {
    if (open && customerId && activeTab === 'dispatches' && customer) {
      void loadDispatches()
    }
  }, [open, customerId, activeTab, customer, loadDispatches])

  useEffect(() => {
    if (open && customerId && activeTab === 'invoices') {
      fetchInvoices()
    }
  }, [open, customerId, activeTab, pagination.current_page, pagination.per_page])

  const fetchCustomer = async () => {
    if (!customerId) return
    try {
      setIsLoading(true)
      const data = await customerApi.getCustomer(customerId)
      setCustomer(data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load customer')
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInvoices = async () => {
    if (!customerId) return
    try {
      setInvoicesLoading(true)
      const response = await customerApi.getCustomerInvoices(customerId, {
        page: pagination.current_page,
        per_page: pagination.per_page,
      })
      setInvoices(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load invoices')
    } finally {
      setInvoicesLoading(false)
    }
  }

  const getStatusBadge = (status: number, isOverdue: boolean) => {
    if (isOverdue) {
      return <Badge variant='destructive'>Overdue</Badge>
    }
    switch (status) {
      case 0:
        return <Badge variant='secondary'>Draft</Badge>
      case 1:
        return (
          <Badge variant='outline' className='bg-yellow-500 text-white border-yellow-500'>
            Sent
          </Badge>
        )
      case 2:
        return <Badge variant='destructive'>Unpaid</Badge>
      case 3:
        return <Badge variant='default'>Partial</Badge>
      case 4:
        return (
          <Badge variant='default' className='bg-green-500 text-white'>
            Paid
          </Badge>
        )
      default:
        return <Badge variant='secondary'>Unknown</Badge>
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto !sm:max-w-[95vw] !md:max-w-[95vw] !lg:max-w-[90vw] !xl:max-w-[85vw]'>
        <DialogHeader>
          <DialogTitle>
            {customer ? customer.name : 'Customer Details'}
          </DialogTitle>
          <DialogDescription>
            {customer && `Customer Number: ${customer.customer_number}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : customer ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
            <TabsList className='flex h-auto min-h-10 flex-wrap gap-1'>
              <TabsTrigger value='info'>Customer Info</TabsTrigger>
              <TabsTrigger value='invoices'>
                Invoices ({customer.statistics.total_invoice_count})
              </TabsTrigger>
              <TabsTrigger value='dispatches'>Dispatches</TabsTrigger>
            </TabsList>

            <TabsContent value='info' className='space-y-4'>
              {/* Customer Statistics */}
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardDescription>Total Invoice Sum</CardDescription>
                    <CardTitle className='text-2xl'>
                      {customer.statistics.total_invoice_sum_formatted}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardDescription>Total Invoices</CardDescription>
                    <CardTitle className='text-2xl'>
                      {customer.statistics.total_invoice_count}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardDescription>Balance</CardDescription>
                    <CardTitle className='text-2xl'>{customer.balance_formatted}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardDescription>Overdue</CardDescription>
                    <CardTitle className='text-2xl'>
                      {customer.statistics.overdue_formatted}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Short Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>TIN</TableHead>
                          <TableHead>VRN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell>{customer.short_name}</TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>{customer.contact}</TableCell>
                          <TableCell>{customer.tax_number || '-'}</TableCell>
                          <TableCell>{customer.vrn || '-'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Billing Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Zip</TableHead>
                          <TableHead>Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>{customer.billing.name || '-'}</TableCell>
                          <TableCell>{customer.billing.phone || '-'}</TableCell>
                          <TableCell>{customer.billing.country || '-'}</TableCell>
                          <TableCell>{customer.billing.state || '-'}</TableCell>
                          <TableCell>{customer.billing.city || '-'}</TableCell>
                          <TableCell>{customer.billing.zip || '-'}</TableCell>
                          <TableCell>{customer.billing.address || '-'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Zip</TableHead>
                          <TableHead>Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>{customer.shipping.name || '-'}</TableCell>
                          <TableCell>{customer.shipping.phone || '-'}</TableCell>
                          <TableCell>{customer.shipping.country || '-'}</TableCell>
                          <TableCell>{customer.shipping.state || '-'}</TableCell>
                          <TableCell>{customer.shipping.city || '-'}</TableCell>
                          <TableCell>{customer.shipping.zip || '-'}</TableCell>
                          <TableCell>{customer.shipping.address || '-'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='invoices' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Customer Invoices</CardTitle>
                  <CardDescription>
                    {pagination.total > 0 &&
                      `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} invoices`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className='flex items-center justify-center py-8'>
                      <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      No invoices found
                    </div>
                  ) : (
                    <div className='rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice#</TableHead>
                            <TableHead>Container#</TableHead>
                            <TableHead>Issue Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className='text-right'>Total Tax</TableHead>
                            <TableHead className='text-right'>Amount</TableHead>
                            <TableHead className='text-right'>Paid Amount</TableHead>
                            <TableHead className='text-right'>Due Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right w-[52px]'>
                              <span className='sr-only'>CMTS details</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className='font-medium'>
                                {invoice.invoice_number}
                              </TableCell>
                              <TableCell className='max-w-[220px] font-mono text-xs'>
                                {containersLoading ? (
                                  <span className='text-muted-foreground'>…</span>
                                ) : (
                                  containerByInvoiceId[invoice.id] ?? '-'
                                )}
                              </TableCell>
                              <TableCell>{invoice.issue_date}</TableCell>
                              <TableCell>
                                {invoice.is_overdue ? (
                                  <span className='text-destructive'>{invoice.due_date}</span>
                                ) : (
                                  invoice.due_date
                                )}
                              </TableCell>
                              <TableCell className='text-right'>
                                {invoice.total_tax_formatted}
                              </TableCell>
                              <TableCell className='text-right'>{invoice.amount_formatted}</TableCell>
                              <TableCell className='text-right'>
                                {invoice.paid_amount_formatted ??
                                  (Number.isFinite(invoice.amount) && Number.isFinite(invoice.due_amount)
                                    ? new Intl.NumberFormat(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }).format(Math.max(0, invoice.amount - invoice.due_amount))
                                    : '—')}
                              </TableCell>
                              <TableCell className='text-right'>
                                {invoice.due_amount_formatted}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(invoice.status, invoice.is_overdue)}
                              </TableCell>
                              <TableCell className='text-right' onClick={(e) => e.stopPropagation()}>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='sm'
                                  className='h-8 w-8 p-0'
                                  title='CMTS consignment & goods'
                                  onClick={() => {
                                    setCargoInvoiceNo(invoice.invoice_number)
                                    setCargoModalOpen(true)
                                  }}
                                >
                                  <Info className='h-4 w-4' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {!invoicesLoading && pagination.total > 0 && (
                    <div className='flex items-center justify-between mt-4 pt-4 border-t'>
                      <div className='text-sm text-muted-foreground'>
                        Showing {pagination.from} to {pagination.to} of {pagination.total} invoices
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              current_page: prev.current_page - 1,
                            }))
                          }
                          disabled={pagination.current_page === 1}
                        >
                          <ChevronLeft className='h-4 w-4' />
                          Previous
                        </Button>
                        <div className='flex items-center gap-1'>
                          {Array.from(
                            { length: Math.min(5, pagination.last_page) },
                            (_, i) => {
                              let pageNum: number
                              if (pagination.last_page <= 5) {
                                pageNum = i + 1
                              } else if (pagination.current_page <= 3) {
                                pageNum = i + 1
                              } else if (
                                pagination.current_page >=
                                pagination.last_page - 2
                              ) {
                                pageNum = pagination.last_page - 4 + i
                              } else {
                                pageNum = pagination.current_page - 2 + i
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    pagination.current_page === pageNum ? 'default' : 'outline'
                                  }
                                  size='sm'
                                  onClick={() =>
                                    setPagination((prev) => ({ ...prev, current_page: pageNum }))
                                  }
                                  className='w-10'
                                >
                                  {pageNum}
                                </Button>
                              )
                            }
                          )}
                        </div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              current_page: prev.current_page + 1,
                            }))
                          }
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
            </TabsContent>

            <TabsContent value='dispatches' className='space-y-4'>
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base'>Goods dispatched (CMTS)</CardTitle>
                  <CardDescription className='text-xs'>
                    Same layout as the dashboard dispatch report. Rows are filtered with your Torchlight
                    email, tax ID, and — when both exist — name and phone together against GNM so unrelated
                    consignments are not included.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='flex flex-wrap items-end gap-2'>
                    <div className='space-y-1'>
                      <label className='text-muted-foreground text-xs'>From</label>
                      <Input
                        type='date'
                        className='h-9 w-[150px]'
                        value={dispatchDateFrom}
                        onChange={(e) => setDispatchDateFrom(e.target.value)}
                      />
                    </div>
                    <div className='space-y-1'>
                      <label className='text-muted-foreground text-xs'>To</label>
                      <Input
                        type='date'
                        className='h-9 w-[150px]'
                        value={dispatchDateTo}
                        onChange={(e) => setDispatchDateTo(e.target.value)}
                      />
                    </div>
                    <Button type='button' size='sm' variant='secondary' onClick={() => void loadDispatches()}>
                      Refresh
                    </Button>
                  </div>
                  {!dispatchLoading && dispatchSummary ? (
                    <p className='text-muted-foreground text-xs'>
                      {dispatchDateFrom} – {dispatchDateTo} · Loan and cash · {dispatchSummary.row_count}{' '}
                      {dispatchSummary.row_count === 1 ? 'line' : 'lines'}
                      <br />
                      Cash {dispatchSummary.cash_rows} · Credit (loan) {dispatchSummary.loan_rows} · Paid in full{' '}
                      {dispatchSummary.paid_rows} · Not paid in full {dispatchSummary.unpaid_rows}
                      <br />
                      Credit dispatch · invoice paid in full {dispatchSummary.credit_dispatch_paid_rows} ·
                      still outstanding {dispatchSummary.credit_dispatch_unpaid_rows}
                    </p>
                  ) : null}
                  {dispatchLoading ? (
                    <div className='text-muted-foreground flex items-center gap-2 py-8 text-sm'>
                      <Loader2 className='h-5 w-5 animate-spin' />
                      Loading…
                    </div>
                  ) : dispatchRows.length === 0 ? (
                    <p className='text-muted-foreground py-6 text-center text-sm'>
                      No dispatched lines in this period for this customer profile in GNM.
                    </p>
                  ) : (
                    <div className='max-h-[min(52vh,520px)] overflow-auto rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='min-w-[140px]'>Dispatch</TableHead>
                            <TableHead className='min-w-[160px]'>Customer</TableHead>
                            <TableHead className='min-w-[220px]'>Consignment</TableHead>
                            <TableHead className='min-w-[140px]'>Pickup / vehicle</TableHead>
                            <TableHead className='min-w-[200px]'>Goods (line)</TableHead>
                            <TableHead className='min-w-[180px]'>Billing</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dispatchRows.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div className='text-muted-foreground tabular-nums whitespace-nowrap'>
                                  {formatGoodsDispatchedAt(r.dispatched_at)}
                                </div>
                                <div className='mt-1 font-mono text-xs text-muted-foreground'>
                                  {r.dispatch_reference || '—'}
                                </div>
                                {r.dispatched_by_name ? (
                                  <div className='mt-1 text-xs text-muted-foreground'>By {r.dispatched_by_name}</div>
                                ) : null}
                                <div className='mt-1 text-xs capitalize text-muted-foreground'>
                                  {r.release_type === 'loan' ? 'Credit' : 'Cash'}
                                </div>
                              </TableCell>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div className='font-medium'>{r.customer_name || '—'}</div>
                                {r.customer_company_name ? (
                                  <div className='text-muted-foreground mt-0.5 text-sm'>
                                    {r.customer_company_name}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div>{r.consignment_name || '—'}</div>
                                <div className='text-muted-foreground mt-0.5 tabular-nums text-xs'>
                                  {r.consignment_tracking || '—'}
                                </div>
                                {r.consignment_label ? (
                                  <div className='text-muted-foreground mt-0.5 text-xs'>Label: {r.consignment_label}</div>
                                ) : null}
                                <div className='text-muted-foreground mt-1 text-xs'>
                                  {[
                                    r.consignment_pkgs != null ? `${r.consignment_pkgs} ctn pkg` : null,
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
                                  <div className='text-muted-foreground mt-0.5 tabular-nums text-xs'>
                                    {r.pickup_cellphone}
                                  </div>
                                ) : null}
                                {r.pickup_vehicle ? (
                                  <div className='text-muted-foreground mt-0.5 font-mono text-xs'>
                                    {r.pickup_vehicle}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div className='font-medium'>{r.good_name || '—'}</div>
                                {r.good_supplier_receipt ? (
                                  <div className='text-muted-foreground mt-0.5 text-xs'>
                                    Receipt: {r.good_supplier_receipt}
                                  </div>
                                ) : null}
                                <div className='text-muted-foreground mt-1 tabular-nums text-xs'>
                                  Qty {r.quantity != null ? r.quantity : '—'} · Pkgs{' '}
                                  {r.pkgs != null ? r.pkgs : '—'} · {r.unit ?? '—'}
                                </div>
                              </TableCell>
                              <TableCell className='align-top whitespace-normal text-sm'>
                                <div className='leading-snug font-medium'>{r.credit_dispatch_note}</div>
                                <div className='mt-2 tabular-nums text-xs'>Invoice: {r.invoice_no ?? '—'}</div>
                                <div className='mt-1 text-xs'>
                                  Paid in full:{' '}
                                  <span className='font-medium'>
                                    {r.bill_fully_paid ? 'Yes' : 'No'}
                                  </span>
                                </div>
                                <div className='text-muted-foreground mt-1 text-xs'>
                                  Balance: {r.bill_balance != null ? r.bill_balance : '—'}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>

    <InvoiceConsignmentsGoodsModal
      open={cargoModalOpen}
      onOpenChange={(o) => {
        setCargoModalOpen(o)
        if (!o) setCargoInvoiceNo(null)
      }}
      invoiceNo={cargoInvoiceNo}
    />
    </>
  )
}
