import { useCallback, useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  customerApi,
  expensePaymentApi,
  invoiceApi,
  paymentApi,
  type GoodsDispatchedReportData,
  type GoodsDispatchedReportRow,
  type PaginationMeta,
} from '@/lib/api'
import type { DashboardDateRange } from '../dashboard-date-range'

export type DashboardStatKey =
  | 'customers'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'loan-dispatch'

const PER_PAGE = 15
const INVOICE_NON_DRAFT_STATUSES = [1, 2, 3, 4]

const STAT_TITLES: Record<DashboardStatKey, string> = {
  customers: 'Customers',
  invoices: 'Total invoices',
  payments: 'Total payments',
  expenses: 'Total expenses',
  'loan-dispatch': 'Loan dispatch',
}

const EMPTY_PAGINATION: PaginationMeta = {
  current_page: 1,
  per_page: PER_PAGE,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
}

const SKELETON_ROW_COUNT = 8

const STAT_TABLE_HEADERS: Record<DashboardStatKey, string[]> = {
  customers: ['#', 'Number', 'Name', 'Phone', 'Email', 'Balance'],
  invoices: ['#', 'Invoice', 'Customer', 'Issue date', 'Amount', 'Due', 'Status'],
  payments: ['S/N', 'Customer', 'Invoice Number', 'Invoice Amount', 'Paid Amount', 'Account', 'Status'],
  expenses: ['#', 'Date', 'Amount', 'Vendor', 'Category', 'Account', 'Reference'],
  'loan-dispatch': ['Dispatch', 'Customer', 'Goods', 'Billing'],
}

/** Per-column skeleton widths (repeat last entry if fewer than column count). */
const STAT_SKELETON_WIDTHS: Partial<Record<DashboardStatKey, string[]>> = {
  customers: ['w-8', 'w-20', 'w-32', 'w-24', 'w-40', 'w-16'],
  invoices: ['w-8', 'w-24', 'w-28', 'w-20', 'w-16', 'w-16', 'w-20'],
  payments: ['w-8', 'w-28', 'w-28', 'w-16', 'w-20', 'w-24', 'w-20'],
  expenses: ['w-8', 'w-20', 'w-16', 'w-28', 'w-24', 'w-24', 'w-20'],
  'loan-dispatch': ['w-32', 'w-28', 'w-36', 'w-28'],
}

function StatTableSkeleton({ statKey }: { statKey: DashboardStatKey }) {
  const headers = STAT_TABLE_HEADERS[statKey]
  const widths = STAT_SKELETON_WIDTHS[statKey] ?? []

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((label) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIdx) => (
            <TableRow key={rowIdx}>
              {headers.map((label, colIdx) => (
                <TableCell key={`${rowIdx}-${label}`}>
                  <Skeleton
                    className={`h-4 ${widths[colIdx] ?? widths[widths.length - 1] ?? 'w-full max-w-[120px]'}`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
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

function PaginationBar({
  pagination,
  loading,
  onPageChange,
}: {
  pagination: PaginationMeta
  loading: boolean
  onPageChange: (page: number) => void
}) {
  if (pagination.last_page <= 1 && pagination.total <= PER_PAGE) return null

  return (
    <div className='flex items-center justify-between gap-2 border-t pt-3'>
      <p className='text-xs text-muted-foreground'>
        {pagination.from != null && pagination.to != null
          ? `Showing ${pagination.from}–${pagination.to} of ${pagination.total}`
          : `${pagination.total} records`}
      </p>
      <div className='flex items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={loading || pagination.current_page <= 1}
          onClick={() => onPageChange(pagination.current_page - 1)}
        >
          <ChevronLeft className='h-4 w-4' />
          Previous
        </Button>
        <span className='text-xs tabular-nums text-muted-foreground'>
          Page {pagination.current_page} of {pagination.last_page}
        </span>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={loading || pagination.current_page >= pagination.last_page}
          onClick={() => onPageChange(pagination.current_page + 1)}
        >
          Next
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}

type ListRow = Record<string, unknown>

interface DashboardStatDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statKey: DashboardStatKey | null
  range: DashboardDateRange
}

export function DashboardStatDetailModal({
  open,
  onOpenChange,
  statKey,
  range,
}: DashboardStatDetailModalProps) {
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ListRow[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION)
  const [loanRows, setLoanRows] = useState<GoodsDispatchedReportRow[]>([])
  const [loanSummary, setLoanSummary] = useState<GoodsDispatchedReportData['summary'] | null>(null)

  useEffect(() => {
    setPage(1)
  }, [statKey, range.fromStr, range.toStr])

  const loadPage = useCallback(
    async (targetPage: number) => {
      if (!statKey) return

      setLoading(true)
      setError(null)

      try {
        switch (statKey) {
          case 'customers': {
            const res = await customerApi.getCustomers({
              page: targetPage,
              per_page: PER_PAGE,
              sort_by: 'name',
              sort_order: 'asc',
            })
            setRows(res.data as ListRow[])
            setPagination(res.pagination)
            setLoanRows([])
            setLoanSummary(null)
            break
          }
          case 'invoices': {
            const res = await invoiceApi.getInvoices({
              page: targetPage,
              per_page: PER_PAGE,
              sort_by: 'issue_date',
              sort_order: 'desc',
              status: INVOICE_NON_DRAFT_STATUSES,
              issue_date: range.issueDateRange,
            })
            setRows(res.data as ListRow[])
            setPagination(res.pagination)
            setLoanRows([])
            setLoanSummary(null)
            break
          }
          case 'payments': {
            const res = await paymentApi.getPayments({
              page: targetPage,
              per_page: PER_PAGE,
              sort_by: 'date',
              sort_order: 'desc',
              date_from: range.fromStr,
              date_to: range.toStr,
            })
            setRows(res.data as ListRow[])
            setPagination(res.pagination)
            setLoanRows([])
            setLoanSummary(null)
            break
          }
          case 'expenses': {
            const res = await expensePaymentApi.getExpensePayments({
              page: targetPage,
              per_page: PER_PAGE,
              sort_by: 'date',
              sort_order: 'desc',
              date: range.expenseDateRange,
            })
            setRows(res.data as ListRow[])
            setPagination(res.pagination)
            setLoanRows([])
            setLoanSummary(null)
            break
          }
          case 'loan-dispatch': {
            const res = await invoiceApi.getGoodsDispatchedReport({
              date_from: range.fromStr,
              date_to: range.toStr,
              release: 'loan',
              page: targetPage,
              per_page: PER_PAGE,
            })
            if (!res.ok) {
              throw new Error(res.message)
            }
            setLoanRows(res.data.rows)
            setLoanSummary(res.data.summary)
            setRows([])
            if (res.data.pagination) {
              setPagination(res.data.pagination)
            } else {
              setPagination({
                current_page: targetPage,
                per_page: PER_PAGE,
                total: res.data.summary.row_count,
                last_page: 1,
                from: res.data.rows.length ? 1 : null,
                to: res.data.rows.length || null,
              })
            }
            break
          }
          default:
            break
        }
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: string }).message)
            : 'Failed to load data'
        setError(msg)
        setRows([])
        setLoanRows([])
        setLoanSummary(null)
        setPagination(EMPTY_PAGINATION)
      } finally {
        setLoading(false)
      }
    },
    [statKey, range],
  )

  useEffect(() => {
    if (!open || !statKey) return
    void loadPage(page)
  }, [open, statKey, page, loadPage])

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
  }

  const rangeNote =
    statKey === 'customers'
      ? 'All customers in your account.'
      : `Filtered for ${range.subtitle}.`

  const loanSubtitle =
    loanSummary &&
    `Outstanding balance total: ${loanSummary.loan_outstanding_balance_total.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} USD · ${loanSummary.loan_outstanding_bill_count} bill(s)`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[min(90vh,820px)] flex-col gap-0 overflow-hidden sm:max-w-4xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{statKey ? STAT_TITLES[statKey] : 'Details'}</DialogTitle>
          <DialogDescription>
            {rangeNote}
            {statKey === 'loan-dispatch' && loanSubtitle ? (
              <span className='mt-1 block'>{loanSubtitle}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-auto py-3'>
          {loading && statKey ? (
            <StatTableSkeleton statKey={statKey} />
          ) : error ? (
            <p className='py-8 text-center text-sm text-destructive'>{error}</p>
          ) : statKey === 'loan-dispatch' ? (
            <LoanDispatchTable rows={loanRows} />
          ) : statKey === 'customers' ? (
            <CustomersTable rows={rows} page={pagination.current_page} perPage={PER_PAGE} />
          ) : statKey === 'invoices' ? (
            <InvoicesTable rows={rows} page={pagination.current_page} perPage={PER_PAGE} />
          ) : statKey === 'payments' ? (
            <PaymentsTable rows={rows} page={pagination.current_page} perPage={PER_PAGE} />
          ) : statKey === 'expenses' ? (
            <ExpensesTable rows={rows} page={pagination.current_page} perPage={PER_PAGE} />
          ) : null}

          {!loading && !error && statKey === 'loan-dispatch' && loanRows.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              No loan dispatches in this period.
            </p>
          ) : null}
          {!loading && !error && statKey !== 'loan-dispatch' && rows.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>No records found.</p>
          ) : null}
        </div>

        {loading ? (
          <div className='flex items-center justify-between gap-2 border-t pt-3'>
            <Skeleton className='h-4 w-36' />
            <div className='flex items-center gap-2'>
              <Skeleton className='h-8 w-24' />
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-8 w-20' />
            </div>
          </div>
        ) : (
          <PaginationBar pagination={pagination} loading={loading} onPageChange={handlePageChange} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function rowIndex(page: number, perPage: number, index: number) {
  return (page - 1) * perPage + index + 1
}

function CustomersTable({
  rows,
  page,
  perPage,
}: {
  rows: ListRow[]
  page: number
  perPage: number
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-12'>#</TableHead>
          <TableHead>Number</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className='text-right'>Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={String(r.id ?? i)}>
            <TableCell>{rowIndex(page, perPage, i)}</TableCell>
            <TableCell className='font-mono text-xs'>{String(r.customer_number ?? '—')}</TableCell>
            <TableCell className='font-medium'>{String(r.name ?? '—')}</TableCell>
            <TableCell>{String(r.contact ?? '—')}</TableCell>
            <TableCell>{String(r.email ?? '—')}</TableCell>
            <TableCell className='text-right tabular-nums'>
              {String(r.balance_formatted ?? '—')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function InvoicesTable({
  rows,
  page,
  perPage,
}: {
  rows: ListRow[]
  page: number
  perPage: number
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-12'>#</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Issue date</TableHead>
          <TableHead className='text-right'>Amount</TableHead>
          <TableHead className='text-right'>Due</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={String(r.id ?? i)}>
            <TableCell>{rowIndex(page, perPage, i)}</TableCell>
            <TableCell className='font-medium'>{String(r.invoice_number ?? '—')}</TableCell>
            <TableCell>{String(r.customer_name ?? '—')}</TableCell>
            <TableCell>{String(r.issue_date ?? '—')}</TableCell>
            <TableCell className='text-right tabular-nums'>
              {String(r.amount_formatted ?? '—')}
            </TableCell>
            <TableCell className='text-right tabular-nums'>
              {String(r.due_formatted ?? '—')}
            </TableCell>
            <TableCell>
              <Badge variant='outline'>{String(r.status_label ?? '—')}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PaymentsTable({
  rows,
  page,
  perPage,
}: {
  rows: ListRow[]
  page: number
  perPage: number
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>S/N</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Invoice Number</TableHead>
          <TableHead className='text-right'>Invoice Amount</TableHead>
          <TableHead className='text-right'>Paid Amount</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={String(r.id ?? i)}>
            <TableCell>{rowIndex(page, perPage, i)}</TableCell>
            <TableCell>{String(r.customer_name ?? '--')}</TableCell>
            <TableCell className='font-medium'>
              <div className='flex items-center gap-2'>
                <FileText className='h-4 w-4 shrink-0 text-muted-foreground' />
                {String(r.invoice_number ?? '—')}
              </div>
            </TableCell>
            <TableCell className='text-right tabular-nums'>
              {String(r.invoice_amount_formatted ?? '—')}
            </TableCell>
            <TableCell className='text-right'>
              <div className='flex flex-col items-end'>
                <span className='tabular-nums'>{String(r.amount_formatted ?? '—')}</span>
                {r.amount_usd_formatted ? (
                  <span className='text-xs text-muted-foreground'>
                    USD: {String(r.amount_usd_formatted)}
                  </span>
                ) : null}
              </div>
            </TableCell>
            <TableCell>{String(r.account_name ?? '—')}</TableCell>
            <TableCell>{String(r.invoice_status_label ?? '—')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ExpensesTable({
  rows,
  page,
  perPage,
}: {
  rows: ListRow[]
  page: number
  perPage: number
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-12'>#</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className='text-right'>Amount</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Reference</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={String(r.id ?? i)}>
            <TableCell>{rowIndex(page, perPage, i)}</TableCell>
            <TableCell>{String(r.date ?? '—')}</TableCell>
            <TableCell className='text-right tabular-nums'>
              {String(r.amount_formatted ?? '—')}
            </TableCell>
            <TableCell>{String(r.vender_name ?? '—')}</TableCell>
            <TableCell>{String(r.category_name ?? '—')}</TableCell>
            <TableCell>{String(r.account_name ?? '—')}</TableCell>
            <TableCell>{String(r.reference ?? '—')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function LoanDispatchTable({ rows }: { rows: GoodsDispatchedReportRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='min-w-[130px]'>Dispatch</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Goods</TableHead>
          <TableHead className='min-w-[140px]'>Billing</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className='align-top text-sm'>
              <div className='tabular-nums whitespace-nowrap'>
                {formatGoodsDispatchedAt(r.dispatched_at)}
              </div>
              <div className='mt-1 font-mono text-xs text-muted-foreground'>
                {r.dispatch_reference || '—'}
              </div>
            </TableCell>
            <TableCell className='align-top'>
              <div className='font-medium'>{r.customer_name || '—'}</div>
              {r.customer_company_name ? (
                <div className='text-xs text-muted-foreground'>{r.customer_company_name}</div>
              ) : null}
            </TableCell>
            <TableCell className='align-top text-sm'>
              <div>{r.good_name || '—'}</div>
              {r.consignment_tracking ? (
                <div className='text-xs text-muted-foreground'>{r.consignment_tracking}</div>
              ) : null}
            </TableCell>
            <TableCell className='align-top text-sm'>
              <div>{r.invoice_no || '—'}</div>
              {r.bill_balance != null ? (
                <div className='mt-1 tabular-nums text-muted-foreground'>
                  Balance:{' '}
                  {r.bill_balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                </div>
              ) : null}
              <div className='mt-1 text-xs text-muted-foreground'>{r.credit_dispatch_note}</div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
