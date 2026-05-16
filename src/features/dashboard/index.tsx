import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
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
import {
  DashboardStatDetailModal,
  type DashboardStatKey,
} from './components/dashboard-stat-detail-modal'
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
  outstandingBalance: number
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

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentInvoices, setRecentInvoices] = useState<DashboardInvoice[]>([])
  const [recentPayments, setRecentPayments] = useState<DashboardPayment[]>([])
  const [recentExpensePayments, setRecentExpensePayments] = useState<DashboardExpensePayment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statDetailKey, setStatDetailKey] = useState<DashboardStatKey | null>(null)

  const openStatDetail = (key: DashboardStatKey) => {
    if (isLoading) return
    setStatDetailKey(key)
  }

  const statCardProps = (key: DashboardStatKey) => ({
    role: 'button' as const,
    tabIndex: 0,
    className: cn(
      'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      isLoading && 'pointer-events-none opacity-80',
    ),
    onClick: () => openStatDetail(key),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openStatDetail(key)
      }
    },
  })

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
          outstandingBalance: s.loan_outstanding_balance_total,
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
              <Card {...statCardProps('customers')}>
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
                  <div className='text-lg font-bold tabular-nums leading-none sm:text-xl'>
                    {metrics ? metrics.customerCount : isLoading ? '...' : '0'}
                  </div>
                </CardContent>
              </Card>
              <Card {...statCardProps('invoices')}>
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
                  <div className='flex flex-nowrap items-baseline gap-x-1.5'>
                    <div className='min-w-0 text-lg font-bold tabular-nums leading-none sm:text-xl'>
                      {metrics
                        ? metrics.totalInvoiceAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : isLoading
                          ? '...'
                          : '0'}
                    </div>
                    <span className='shrink-0 text-xs font-semibold tracking-wide text-muted-foreground'>
                      USD
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card {...statCardProps('payments')}>
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
                  <div className='flex flex-nowrap items-baseline gap-x-1.5'>
                    <div className='min-w-0 text-lg font-bold tabular-nums leading-none sm:text-xl'>
                      {metrics
                        ? metrics.totalPayments.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : isLoading
                          ? '...'
                          : '0'}
                    </div>
                    <span className='shrink-0 text-xs font-semibold tracking-wide text-muted-foreground'>
                      USD
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card {...statCardProps('expenses')}>
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
                  <div className='flex flex-nowrap items-baseline gap-x-1.5'>
                    <div className='min-w-0 text-lg font-bold tabular-nums leading-none sm:text-xl'>
                      {metrics
                        ? metrics.totalExpenses.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : isLoading
                          ? '...'
                          : '0'}
                    </div>
                    <span className='shrink-0 text-xs font-semibold tracking-wide text-muted-foreground'>
                      USD
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card {...statCardProps('loan-dispatch')}>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Loan dispatch</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                    aria-hidden
                  >
                    <line x1='3' x2='21' y1='22' y2='22' />
                    <line x1='6' x2='6' y1='18' y2='11' />
                    <line x1='10' x2='10' y1='18' y2='11' />
                    <line x1='14' x2='14' y1='18' y2='11' />
                    <line x1='18' x2='18' y1='18' y2='11' />
                    <polygon points='12 2 20 7 4 7' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='flex flex-nowrap items-baseline gap-x-1.5'>
                    <div className='min-w-0 text-lg font-bold tabular-nums leading-none sm:text-xl'>
                      {metrics?.loanDispatch
                        ? metrics.loanDispatch.outstandingBalance.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : isLoading
                          ? '...'
                          : '—'}
                    </div>
                    {metrics?.loanDispatch ? (
                      <span className='shrink-0 text-xs font-semibold tracking-wide text-muted-foreground'>
                        USD
                      </span>
                    ) : null}
                  </div>
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

      <DashboardStatDetailModal
        open={statDetailKey !== null}
        onOpenChange={(next) => {
          if (!next) setStatDetailKey(null)
        }}
        statKey={statDetailKey}
        range={activeRange}
      />

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
