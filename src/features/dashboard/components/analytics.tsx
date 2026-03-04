import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  revenueApi,
  expensePaymentApi,
  invoiceApi,
  customerApi,
  vendorApi,
  paymentApi,
  type PaginationMeta,
} from '@/lib/api'
import { AnalyticsChart, type AnalyticsDatum } from './analytics-chart'

type AnalyticsSummary = {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  invoiceUnpaidCount: number
  invoicePaidCount: number
  invoicePartialCount: number
  customerCount: number
  vendorCount: number
  paymentCount: number
  expensePaymentCount: number
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsDatum[]>([])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    void loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const start = new Date(end)
      start.setMonth(start.getMonth() - 5)
      start.setDate(1)

      const formatDate = (d: Date) => d.toISOString().slice(0, 10)
      const range = `${formatDate(start)} to ${formatDate(end)}`

      const [
        revenuesRes,
        expensePaymentsForAmountsRes,
        invoicesUnpaidRes,
        invoicesPaidRes,
        invoicesPartialRes,
        customersRes,
        vendorsRes,
        paymentsRes,
        expensePaymentsForCountRes,
      ] = await Promise.all([
        revenueApi.getRevenues({ per_page: 1000, date: range }),
        expensePaymentApi.getExpensePayments({ per_page: 1000, date: range }),
        invoiceApi.getInvoices({
          per_page: 1,
          status: 2, // Unpaid
          issue_date: range,
        }),
        invoiceApi.getInvoices({
          per_page: 1,
          status: 4, // Paid
          issue_date: range,
        }),
        invoiceApi.getInvoices({
          per_page: 1,
          status: 3, // Partial Paid
          issue_date: range,
        }),
        customerApi.getCustomers({ per_page: 1 }),
        vendorApi.getVendors({ per_page: 1 }),
        paymentApi.getPayments({ per_page: 1 }),
        expensePaymentApi.getExpensePayments({ per_page: 1, date: range }),
      ])

      const revenues = revenuesRes.data as any[]
      const expensePaymentsForAmounts = expensePaymentsForAmountsRes.data as any[]

      const monthKey = (rawDate: string | undefined) => {
        if (!rawDate) return ''
        return rawDate.slice(0, 7) // YYYY-MM
      }

      const revenueByMonth = new Map<string, number>()
      const expenseByMonth = new Map<string, number>()

      revenues.forEach((r) => {
        const key = monthKey(r.date_raw || r.date)
        if (!key) return
        const val = typeof r.amount === 'number' ? r.amount : Number(r.amount || 0)
        revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + val)
      })

      expensePaymentsForAmounts.forEach((ep) => {
        const key = monthKey(ep.date_raw || ep.date)
        if (!key) return
        const val = typeof ep.amount === 'number' ? ep.amount : Number(ep.amount || 0)
        expenseByMonth.set(key, (expenseByMonth.get(key) || 0) + val)
      })

      const months: string[] = []
      const cursor = new Date(start)
      while (cursor <= end) {
        months.push(cursor.toISOString().slice(0, 7)) // YYYY-MM
        cursor.setMonth(cursor.getMonth() + 1)
      }

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const chartData: AnalyticsDatum[] = months.map((ym) => {
        const [yearStr, monthStr] = ym.split('-')
        const monthIndex = Number(monthStr) - 1
        return {
          name: `${monthNames[monthIndex]} ${yearStr}`,
          revenue: revenueByMonth.get(ym) || 0,
          expenses: expenseByMonth.get(ym) || 0,
        }
      })

      const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0)
      const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0)

      const unpaidMeta: PaginationMeta = invoicesUnpaidRes.pagination
      const paidMeta: PaginationMeta = invoicesPaidRes.pagination
      const partialMeta: PaginationMeta = invoicesPartialRes.pagination
      const customersMeta: PaginationMeta = customersRes.pagination
      const vendorsMeta: PaginationMeta = vendorsRes.pagination
      const paymentsMeta: PaginationMeta = paymentsRes.pagination
      const expenseCountMeta: PaginationMeta = expensePaymentsForCountRes.pagination

      setData(chartData)
      setSummary({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        invoiceUnpaidCount: unpaidMeta?.total ?? 0,
        invoicePaidCount: paidMeta?.total ?? 0,
        invoicePartialCount: partialMeta?.total ?? 0,
        customerCount: customersMeta?.total ?? 0,
        vendorCount: vendorsMeta?.total ?? 0,
        paymentCount: paymentsMeta?.total ?? 0,
        expensePaymentCount: expenseCountMeta?.total ?? 0,
      })
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to load analytics data', err)
      setError(err?.response?.data?.message || err?.message || 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  const monthsCount = data.length || 1

  const avgMonthlyRevenue =
    summary && monthsCount > 0 ? summary.totalRevenue / monthsCount : 0
  const avgMonthlyExpenses =
    summary && monthsCount > 0 ? summary.totalExpenses / monthsCount : 0

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <div>
            <CardTitle>Revenue vs expenses</CardTitle>
            <CardDescription>
              Last {monthsCount} months, aggregated by month.
            </CardDescription>
            {error && (
              <p className='mt-1 text-xs text-destructive'>
                {error}
              </p>
            )}
          </div>
          <div>
            <button
              type='button'
              className='text-xs text-muted-foreground underline-offset-2 hover:underline'
              disabled={isLoading}
              onClick={() => {
                void loadAnalytics()
              }}
            >
              {isLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </CardHeader>
        <CardContent className='px-6'>
          <AnalyticsChart data={data} isLoading={isLoading} />
        </CardContent>
      </Card>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total revenue (period)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>
              {summary
                ? summary.totalRevenue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : isLoading
                  ? '...'
                  : '0'}
            </div>
            <p className='text-xs text-muted-foreground'>
              Across the last {monthsCount} months.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total expenses (period)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>
              {summary
                ? summary.totalExpenses.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : isLoading
                  ? '...'
                  : '0'}
            </div>
            <p className='text-xs text-muted-foreground'>
              Expense payments over the same period.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>
              Net profit (period)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>
              {summary
                ? summary.netProfit.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : isLoading
                  ? '...'
                  : '0'}
            </div>
            <p className='text-xs text-muted-foreground'>
              Revenue minus expenses.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>
              Avg. monthly revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>
              {avgMonthlyRevenue
                ? avgMonthlyRevenue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : isLoading
                  ? '...'
                  : '0'}
            </div>
            <p className='text-xs text-muted-foreground'>
              Over the last {monthsCount} months.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>
              Avg. monthly expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold tabular-nums'>
              {avgMonthlyExpenses
                ? avgMonthlyExpenses.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : isLoading
                  ? '...'
                  : '0'}
            </div>
            <p className='text-xs text-muted-foreground'>
              Over the last {monthsCount} months.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>
              Invoices (this period)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className='space-y-1 text-xs text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <dt>Unpaid</dt>
                <dd className='font-semibold text-destructive tabular-nums'>
                  {summary ? summary.invoiceUnpaidCount : isLoading ? '...' : '0'}
                </dd>
              </div>
              <div className='flex items-center justify-between'>
                <dt>Partial paid</dt>
                <dd className='font-semibold tabular-nums'>
                  {summary ? summary.invoicePartialCount : isLoading ? '...' : '0'}
                </dd>
              </div>
              <div className='flex items-center justify-between'>
                <dt>Paid</dt>
                <dd className='font-semibold text-emerald-600 tabular-nums'>
                  {summary ? summary.invoicePaidCount : isLoading ? '...' : '0'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>
              Customers &amp; vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className='space-y-1 text-xs text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <dt>Customers</dt>
                <dd className='font-semibold tabular-nums'>
                  {summary ? summary.customerCount : isLoading ? '...' : '0'}
                </dd>
              </div>
              <div className='flex items-center justify-between'>
                <dt>Vendors</dt>
                <dd className='font-semibold tabular-nums'>
                  {summary ? summary.vendorCount : isLoading ? '...' : '0'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>
              Payments &amp; expenses (this period)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className='space-y-1 text-xs text-muted-foreground'>
              <div className='flex items-center justify-between'>
                <dt>Invoice payments</dt>
                <dd className='font-semibold tabular-nums'>
                  {summary ? summary.paymentCount : isLoading ? '...' : '0'}
                </dd>
              </div>
              <div className='flex items-center justify-between'>
                <dt>Expense payments</dt>
                <dd className='font-semibold tabular-nums'>
                  {summary ? summary.expensePaymentCount : isLoading ? '...' : '0'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

