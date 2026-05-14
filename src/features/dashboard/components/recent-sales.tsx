import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RecentInvoice = {
  id: number
  invoice_number: string
  customer_name: string
  amount_formatted: string
  issue_date: string
}

type RecentPayment = {
  id: number
  invoice_number: string
  customer_name?: string
  cashier_name?: string
  amount_formatted: string
  date: string
}

type RecentExpensePayment = {
  id: number
  vender_name: string
  amount_formatted: string
  date: string
}

interface RecentSalesProps {
  invoices: RecentInvoice[]
  payments: RecentPayment[]
  expensePayments: RecentExpensePayment[]
  isLoading: boolean
}

function ActivityPanel({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-44 flex-col overflow-hidden rounded-xl border bg-card shadow-sm',
        className,
      )}
    >
      <div className='border-b bg-muted/40 px-4 py-2.5'>
        <h3 className='text-sm font-semibold tracking-tight'>{title}</h3>
      </div>
      <div className='min-h-0 flex-1 p-2'>{children}</div>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className='flex min-h-44 flex-col overflow-hidden rounded-xl border bg-muted/20'>
      <div className='h-10 border-b bg-muted/30 px-4 py-2'>
        <div className='h-4 w-28 animate-pulse rounded bg-muted' />
      </div>
      <div className='space-y-3 p-3'>
        <div className='h-12 animate-pulse rounded-md bg-muted/80' />
        <div className='h-12 animate-pulse rounded-md bg-muted/80' />
        <div className='h-12 animate-pulse rounded-md bg-muted/60' />
      </div>
    </div>
  )
}

export function RecentSales({
  invoices,
  payments,
  expensePayments,
  isLoading,
}: RecentSalesProps) {
  if (isLoading) {
    return (
      <div className='grid gap-4 md:grid-cols-3'>
        <PanelSkeleton />
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    )
  }

  return (
    <div className='grid gap-4 md:grid-cols-3'>
      <ActivityPanel title='Invoices'>
        {invoices.length === 0 ? (
          <p className='px-2 py-6 text-center text-xs text-muted-foreground'>No recent invoices</p>
        ) : (
          <ul className='divide-y rounded-lg border bg-background/80'>
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className='flex flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between sm:gap-3'
              >
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-mono text-sm font-medium'>{inv.invoice_number}</p>
                  <p className='truncate text-xs text-muted-foreground'>
                    {inv.customer_name}
                    <span className='text-muted-foreground/70'> · </span>
                    {inv.issue_date}
                  </p>
                </div>
                <p className='shrink-0 text-sm font-semibold tabular-nums text-foreground sm:pt-0.5 sm:text-right'>
                  {inv.amount_formatted}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ActivityPanel>

      <ActivityPanel title='Invoice payments'>
        {payments.length === 0 ? (
          <p className='px-2 py-6 text-center text-xs text-muted-foreground'>No recent payments</p>
        ) : (
          <ul className='divide-y rounded-lg border bg-background/80'>
            {payments.map((pmt) => (
              <li
                key={pmt.id}
                className='flex flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between sm:gap-3'
              >
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-mono text-sm font-medium'>{pmt.invoice_number}</p>
                  <p className='truncate text-xs text-muted-foreground'>{pmt.date}</p>
                  {(pmt.customer_name || pmt.cashier_name) && (
                    <p className='mt-0.5 truncate text-[11px] leading-snug text-muted-foreground'>
                      {pmt.customer_name ? <span>{pmt.customer_name}</span> : null}
                      {pmt.customer_name && pmt.cashier_name ? (
                        <span className='text-muted-foreground/60'> · </span>
                      ) : null}
                      {pmt.cashier_name ? <span>Cashier: {pmt.cashier_name}</span> : null}
                    </p>
                  )}
                </div>
                <p className='shrink-0 text-sm font-semibold tabular-nums text-foreground sm:pt-0.5 sm:text-right'>
                  {pmt.amount_formatted}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ActivityPanel>

      <ActivityPanel title='Expense payments'>
        {expensePayments.length === 0 ? (
          <p className='px-2 py-6 text-center text-xs text-muted-foreground'>
            No recent expense payments
          </p>
        ) : (
          <ul className='divide-y rounded-lg border bg-background/80'>
            {expensePayments.map((ep) => (
              <li
                key={ep.id}
                className='flex flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-start sm:justify-between sm:gap-3'
              >
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>{ep.vender_name}</p>
                  <p className='truncate text-xs text-muted-foreground'>{ep.date}</p>
                </div>
                <p className='shrink-0 text-sm font-semibold tabular-nums text-foreground sm:pt-0.5 sm:text-right'>
                  {ep.amount_formatted}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ActivityPanel>
    </div>
  )
}
