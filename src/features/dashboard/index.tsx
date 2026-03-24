import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Main } from '@/components/layout/main'
import { customerApi, invoiceApi, paymentApi, revenueApi, expensePaymentApi, type PaginationMeta } from '@/lib/api'
import { Analytics } from './components/analytics'
import { Overview, type OverviewDatum } from './components/overview'
import { RecentSales } from './components/recent-sales'
import { Reports } from './components/reports'

type DashboardMetrics = {
  totalRevenue: number
  totalExpenses: number
  openInvoicesCount: number
  openInvoicesAmount: number
  customerCount: number
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
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [overviewData, setOverviewData] = useState<OverviewDatum[]>([])
  const [recentInvoices, setRecentInvoices] = useState<DashboardInvoice[]>([])
  const [recentPayments, setRecentPayments] = useState<DashboardPayment[]>([])
  const [recentExpensePayments, setRecentExpensePayments] = useState<DashboardExpensePayment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    void loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const formatDate = (d: Date) => d.toISOString().slice(0, 10)
      const monthRange = `${formatDate(startOfMonth)} to ${formatDate(endOfMonth)}`
      const monthPrefix = formatDate(startOfMonth).slice(0, 7) // YYYY-MM

      const [
        revenuesRes,
        expensePaymentsRes,
        invoicesRes,
        paymentsRes,
        customersRes,
      ] = await Promise.all([
        revenueApi.getRevenues({ per_page: 500, date: monthRange }),
        expensePaymentApi.getExpensePayments({ per_page: 500, date: monthRange }),
        invoiceApi.getInvoices({ per_page: 500, sort_by: 'issue_date', sort_order: 'desc' }),
        paymentApi.getPayments({ per_page: 5, sort_by: 'date', sort_order: 'desc' }),
        customerApi.getCustomers({ per_page: 1 }),
      ])

      const revenues = revenuesRes.data as any[]
      const expensePayments = expensePaymentsRes.data as any[]
      const invoices = invoicesRes.data as DashboardInvoice[]
      const payments = paymentsRes.data as DashboardPayment[]
      const customersPagination: PaginationMeta = customersRes.pagination

      const totalRevenue = revenues.reduce(
        (sum, r) => sum + (typeof r.amount === 'number' ? r.amount : Number(r.amount || 0)),
        0,
      )

      const totalExpenses = expensePayments.reduce(
        (sum, ep) => sum + (typeof ep.amount === 'number' ? ep.amount : Number(ep.amount || 0)),
        0,
      )

      const invoicesThisMonth = invoices.filter((inv) => {
        const raw = inv.issue_date_raw || inv.issue_date || ''
        return raw.startsWith(monthPrefix)
      })

      const openInvoices = invoicesThisMonth.filter((inv) => inv.due > 0)
      const openInvoicesCount = openInvoices.length
      const openInvoicesAmount = openInvoices.reduce(
        (sum, inv) => sum + (typeof inv.due === 'number' ? inv.due : Number(inv.due || 0)),
        0,
      )

      const customerCount = customersPagination?.total ?? 0

      const revenueByDate = new Map<string, number>()
      const expensesByDate = new Map<string, number>()

      revenues.forEach((r) => {
        const key = (r.date_raw || r.date || '').slice(0, 10)
        if (!key) return
        const value = typeof r.amount === 'number' ? r.amount : Number(r.amount || 0)
        revenueByDate.set(key, (revenueByDate.get(key) || 0) + value)
      })

      expensePayments.forEach((ep) => {
        const key = (ep.date_raw || ep.date || '').slice(0, 10)
        if (!key) return
        const value = typeof ep.amount === 'number' ? ep.amount : Number(ep.amount || 0)
        expensesByDate.set(key, (expensesByDate.get(key) || 0) + value)
      })

      const allDates = Array.from(
        new Set<string>([...revenueByDate.keys(), ...expensesByDate.keys()]),
      ).sort()

      const overview: OverviewDatum[] = allDates.map((date) => ({
        name: date.slice(5), // MM-DD
        revenue: revenueByDate.get(date) || 0,
        expenses: expensesByDate.get(date) || 0,
      }))

      const recentInvoicesList = invoices.slice(0, 5)
      const recentExpensePaymentsList = expensePayments.slice(0, 5) as DashboardExpensePayment[]

      setMetrics({
        totalRevenue,
        totalExpenses,
        openInvoicesCount,
        openInvoicesAmount,
        customerCount,
      })
      setOverviewData(overview)
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
  }

  return (
    <>
      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
            {error && (
              <p className='mt-1 text-xs text-destructive'>
                {error}
              </p>
            )}
          </div>
          <div className='flex items-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={isLoading}
              onClick={() => {
                void loadDashboardData()
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='analytics'>Analytics</TabsTrigger>
              <TabsTrigger value='reports'>Reports</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total revenue (this month)
                  </CardTitle>
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
                      ? metrics.totalRevenue.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : isLoading
                        ? '...'
                        : '0'}
                  </div>
                  <p className='text-xs text-muted-foreground'>Summed from revenue records</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total expenses (this month)
                  </CardTitle>
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
                  <p className='text-xs text-muted-foreground'>From expense payments</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Open invoices (this month)
                  </CardTitle>
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
                    <rect width='20' height='14' x='2' y='5' rx='2' />
                    <path d='M2 10h20' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold tabular-nums'>
                    {metrics ? metrics.openInvoicesCount : isLoading ? '...' : '0'}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Due amount:{' '}
                    <span className='font-semibold'>
                      {metrics
                        ? metrics.openInvoicesAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : isLoading
                          ? '...'
                          : '0'}
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Customers
                  </CardTitle>
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
                  <p className='text-xs text-muted-foreground'>Total active customers</p>
                </CardContent>
              </Card>
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview data={overviewData} />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Recent activity</CardTitle>
                  <CardDescription>
                    Latest invoices, invoice payments and expense payments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales
                    invoices={recentInvoices}
                    payments={recentPayments}
                    expensePayments={recentExpensePayments}
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value='analytics' className='space-y-4'>
            <Analytics />
          </TabsContent>
          <TabsContent value='reports' className='space-y-4'>
            <Reports />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

// topNav will be computed inside Dashboard component to use pathname
