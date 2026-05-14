import { useCallback, useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Main } from '@/components/layout/main'
import { cn } from '@/lib/utils'
import { customerApi, invoiceApi, paymentApi, expensePaymentApi, type PaginationMeta } from '@/lib/api'
import { Analytics } from './components/analytics'
import { RecentSales } from './components/recent-sales'
import { Reports } from './components/reports'
import {
  sumInvoicePaymentsForDateRange,
  sumInvoiceTotalsNonDraftForIssueDateRange,
} from './dashboard-metrics'
import {
  buildCustomDashboardDateRange,
  resolveDashboardDateRange,
  type DashboardPeriodPreset,
} from './dashboard-date-range'

const INVOICE_NON_DRAFT_STATUSES = [1, 2, 3, 4]

const PERIOD_OPTIONS: { id: Exclude<DashboardPeriodPreset, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

type LoanDispatchMetrics = {
  loanRows: number
  outstandingBalance: number
  creditPaidRows: number
  creditUnpaidRows: number
  outstandingBillCount: number
  rowsWithoutBill: number
}

type DashboardMetrics = {
  totalInvoiceAmount: number
  totalPayments: number
  totalExpenses: number
  customerCount: number
  loanDispatch: LoanDispatchMetrics | null
}

type DashboardInvoice = {
  id: number
  invoice_number: string
  customer_name: string
  issue_date: string
  issue_date_raw?: string
  amount_formatted: string
  due_formatted: string
  due: number
  is_overdue?: boolean
  status: number
  status_label?: string
}

type DashboardPayment = {
  id: number
  invoice_number: string
  customer_name?: string
  cashier_name?: string
  amount_formatted: string
  date: string
}

type DashboardExpensePayment = {
  id: number
  vender_name: string
  amount_formatted: string
  date: string
}

export function Dashboard() {
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [loanDispatchDetailsOpen, setLoanDispatchDetailsOpen] = useState(false)

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentInvoices, setRecentInvoices] = useState<DashboardInvoice[]>([])
  const [recentPayments, setRecentPayments] = useState<DashboardPayment[]>([])
  const [recentExpensePayments, setRecentExpensePayments] = useState<DashboardExpensePayment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeRange = useMemo(
    () =>
      resolveDashboardDateRange(
        periodPreset,
        periodPreset === 'custom' && customFrom && customTo
          ? { fromStr: customFrom, toStr: customTo }
          : null,
        new Date(),
      ),
    [periodPreset, customFrom, customTo],
  )

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const anchor = new Date()
      const range = resolveDashboardDateRange(
        periodPreset,
        periodPreset === 'custom' && customFrom && customTo
          ? { fromStr: customFrom, toStr: customTo }
          : null,
        anchor,
      )

      const [
        expensePaymentsRes,
        recentInvoicesRes,
        paymentsRes,
        customersRes,
        totalInvoiceAmount,
        totalPayments,
        gdRes,
      ] = await Promise.all([
        expensePaymentApi.getExpensePayments({
          per_page: 500,
          date: range.expenseDateRange,
        }),
        invoiceApi.getInvoices({
          per_page: 5,
          sort_by: 'issue_date',
          sort_order: 'desc',
          issue_date: range.issueDateRange,
          status: INVOICE_NON_DRAFT_STATUSES,
        }),
        paymentApi.getPayments({
          per_page: 5,
          sort_by: 'date',
          sort_order: 'desc',
          date_from: range.fromStr,
          date_to: range.toStr,
        }),
        customerApi.getCustomers({ per_page: 1 }),
        sumInvoiceTotalsNonDraftForIssueDateRange(range.issueDateRange),
        sumInvoicePaymentsForDateRange(range.fromStr, range.toStr),
        invoiceApi.getGoodsDispatchedReport({
          date_from: range.fromStr,
          date_to: range.toStr,
          release: 'loan',
          page: 1,
          per_page: 1,
        }),
      ])

      const expensePayments = expensePaymentsRes.data as any[]
      const recentInvoicesList = recentInvoicesRes.data as DashboardInvoice[]
      const payments = paymentsRes.data as DashboardPayment[]
      const customersPagination: PaginationMeta = customersRes.pagination

      const totalExpenses = expensePayments.reduce(
        (sum, ep) => sum + (typeof ep.amount === 'number' ? ep.amount : Number(ep.amount || 0)),
        0,
      )

      const customerCount = customersPagination?.total ?? 0

      const recentExpensePaymentsList = expensePayments.slice(0, 5) as DashboardExpensePayment[]

      let loanDispatch: LoanDispatchMetrics | null = null
      if (gdRes.ok) {
        const s = gdRes.data.summary
        loanDispatch = {
          loanRows: s.loan_rows,
          outstandingBalance: s.loan_outstanding_balance_total,
          creditPaidRows: s.credit_dispatch_paid_rows,
          creditUnpaidRows: s.credit_dispatch_unpaid_rows,
          outstandingBillCount: s.loan_outstanding_bill_count ?? 0,
          rowsWithoutBill: s.loan_rows_without_bill ?? 0,
        }
      }

      setMetrics({
        totalInvoiceAmount,
        totalPayments,
        totalExpenses,
        customerCount,
        loanDispatch,
      })
      setRecentInvoices(recentInvoicesList)
      setRecentPayments(payments.slice(0, 5))
      setRecentExpensePayments(recentExpensePaymentsList)
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to load dashboard data', err)
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [periodPreset, customFrom, customTo])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  useEffect(() => {
    setLoanDispatchDetailsOpen(false)
  }, [periodPreset, customFrom, customTo])

  const openCustomRangeModal = () => {
    setDraftFrom(activeRange.fromStr)
    setDraftTo(activeRange.toStr)
    setCustomModalOpen(true)
  }

  const applyCustomRange = () => {
    const built = buildCustomDashboardDateRange(draftFrom, draftTo)
    if (!built) {
      toast.error('Enter valid start and end dates. Start must be on or before end.')
      return
    }
    setCustomFrom(built.fromStr)
    setCustomTo(built.toStr)
    setPeriodPreset('custom')
    setCustomModalOpen(false)
  }

  return (
    <>
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
            {error && <p className='mt-1 text-xs text-destructive'>{error}</p>}
          </div>
          <div className='flex items-center space-x-2'>
            <Button variant='outline' size='sm' disabled={isLoading} onClick={() => void loadDashboardData()}>
              Refresh
            </Button>
          </div>
        </div>
        <Tabs orientation='vertical' defaultValue='overview' className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='analytics'>Analytics</TabsTrigger>
              <TabsTrigger value='reports'>Reports</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
              <p className='text-sm text-muted-foreground'>
                Stats for <span className='font-medium text-foreground'>{activeRange.subtitle}</span>
              </p>
              <div className='flex flex-wrap gap-2'>
                {PERIOD_OPTIONS.map((p) => (
                  <Button
                    key={p.id}
                    type='button'
                    size='sm'
                    variant={periodPreset === p.id ? 'default' : 'outline'}
                    disabled={isLoading}
                    onClick={() => setPeriodPreset(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
                <Button
                  type='button'
                  size='sm'
                  variant={periodPreset === 'custom' ? 'default' : 'outline'}
                  disabled={isLoading}
                  onClick={openCustomRangeModal}
                >
                  Custom
                </Button>
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Total invoices</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold tabular-nums'>
                    {metrics
                      ? metrics.totalInvoiceAmount.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : isLoading
                        ? '...'
                        : '0'}
                  </div>
                  <CardDescription className='text-xs'>Non-draft · {activeRange.subtitle}</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Total payments</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold tabular-nums'>
                    {metrics
                      ? metrics.totalPayments.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : isLoading
                        ? '...'
                        : '0'}
                  </div>
                  <CardDescription className='text-xs'>USD basis · {activeRange.subtitle}</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Total expenses</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                    <circle cx='9' cy='7' r='4' />
                    <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold tabular-nums'>
                    {metrics
                      ? metrics.totalExpenses.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : isLoading
                        ? '...'
                        : '0'}
                  </div>
                  <CardDescription className='text-xs'>Expense payments · {activeRange.subtitle}</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Customers</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold tabular-nums'>
                    {metrics ? metrics.customerCount : isLoading ? '...' : '0'}
                  </div>
                  <CardDescription className='text-xs'>All active customers (not filtered by period)</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-start justify-between gap-2 space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium leading-tight'>Loan dispatch (CMTS)</CardTitle>
                  {metrics?.loanDispatch ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className={cn(
                        'h-8 w-8 shrink-0 text-muted-foreground',
                        loanDispatchDetailsOpen && 'text-foreground',
                      )}
                      aria-expanded={loanDispatchDetailsOpen}
                      aria-label={
                        loanDispatchDetailsOpen
                          ? 'Hide loan dispatch details'
                          : 'Show loan dispatch details'
                      }
                      onClick={() => setLoanDispatchDetailsOpen((open) => !open)}
                    >
                      <Info className='h-4 w-4' aria-hidden />
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold tabular-nums'>
                    {metrics?.loanDispatch
                      ? metrics.loanDispatch.outstandingBalance.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : isLoading
                        ? '...'
                        : '—'}
                  </div>
                  {metrics?.loanDispatch ? (
                    loanDispatchDetailsOpen ? (
                      <div className='mt-3 space-y-2 border-t pt-3 text-xs text-muted-foreground'>
                        <p>
                          Total is the sum of each distinct CMTS bill&apos;s outstanding balance
                          (bill line items minus discount minus payments). Multiple goods lines that
                          share one bill are counted once in the total.
                        </p>
                        <p>
                          <span className='font-medium text-foreground'>
                            {metrics.loanDispatch.loanRows.toLocaleString()}
                          </span>{' '}
                          goods line{metrics.loanDispatch.loanRows === 1 ? '' : 's'} on loan in this
                          period ·{' '}
                          <span className='font-medium text-foreground'>
                            {metrics.loanDispatch.outstandingBillCount.toLocaleString()}
                          </span>{' '}
                          bill{metrics.loanDispatch.outstandingBillCount === 1 ? '' : 's'} tied to
                          those lines (each counted once toward the total)
                          <span className='font-medium text-foreground'>
                            {metrics.loanDispatch.creditPaidRows.toLocaleString()}
                          </span>{' '}
                          credit line{metrics.loanDispatch.creditPaidRows === 1 ? '' : 's'} settled ·{' '}
                          <span className='font-medium text-foreground'>
                            {metrics.loanDispatch.creditUnpaidRows.toLocaleString()}
                          </span>{' '}
                          credit line{metrics.loanDispatch.creditUnpaidRows === 1 ? '' : 's'} not
                          fully settled
                        </p>
                        {metrics.loanDispatch.rowsWithoutBill > 0 ? (
                          <p>
                            <span className='font-medium text-foreground'>
                              {metrics.loanDispatch.rowsWithoutBill.toLocaleString()}
                            </span>{' '}
                            open loan line{metrics.loanDispatch.rowsWithoutBill === 1 ? '' : 's'}{' '}
                            have no CMTS bill linked, so they do not add to the balance total.
                          </p>
                        ) : null}
                        <p className='text-[11px]'>Period: {activeRange.subtitle}</p>
                      </div>
                    ) : null
                  ) : (
                    <CardDescription className='pt-1 text-xs'>
                      {isLoading
                        ? 'Loading CMTS…'
                        : 'CMTS goods-dispatched report unavailable for this range.'}
                    </CardDescription>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className='border-b pb-4'>
                <CardTitle className='text-lg'>Recent activity</CardTitle>
                <CardDescription>
                  Latest non-draft invoices, invoice payments, and expense payments for{' '}
                  {activeRange.subtitle}.
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-6'>
                <RecentSales
                  invoices={recentInvoices}
                  payments={recentPayments}
                  expensePayments={recentExpensePayments}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value='analytics' className='space-y-4'>
            <Analytics />
          </TabsContent>
          <TabsContent value='reports' className='space-y-4'>
            <Reports />
          </TabsContent>
        </Tabs>
      </Main>

      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-2'>
              <Label htmlFor='dashboard-custom-from'>Start</Label>
              <Input
                id='dashboard-custom-from'
                type='date'
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='dashboard-custom-to'>End</Label>
              <Input
                id='dashboard-custom-to'
                type='date'
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button type='button' variant='outline' onClick={() => setCustomModalOpen(false)}>
              Cancel
            </Button>
            <Button type='button' onClick={applyCustomRange}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
