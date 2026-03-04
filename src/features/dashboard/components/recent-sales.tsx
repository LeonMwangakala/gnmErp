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

export function RecentSales({
  invoices,
  payments,
  expensePayments,
  isLoading,
}: RecentSalesProps) {
  if (isLoading) {
    return (
      <div className='space-y-2'>
        <div className='h-4 w-40 animate-pulse rounded bg-muted' />
        <div className='h-4 w-56 animate-pulse rounded bg-muted' />
        <div className='h-4 w-48 animate-pulse rounded bg-muted' />
      </div>
    )
  }

  return (
    <div className='space-y-6 text-sm'>
      <section>
        <h3 className='mb-2 text-xs font-semibold uppercase text-muted-foreground'>
          Recent invoices
        </h3>
        {invoices.length === 0 ? (
          <p className='text-xs text-muted-foreground'>No recent invoices</p>
        ) : (
          <ul className='space-y-2'>
            {invoices.map((inv) => (
              <li key={inv.id} className='flex items-center justify-between'>
                <div className='min-w-0'>
                  <p className='truncate font-medium'>{inv.invoice_number}</p>
                  <p className='truncate text-xs text-muted-foreground'>
                    {inv.customer_name} • {inv.issue_date}
                  </p>
                </div>
                <div className='ms-2 shrink-0 text-right text-xs font-semibold tabular-nums'>
                  {inv.amount_formatted}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className='mb-2 text-xs font-semibold uppercase text-muted-foreground'>
          Recent invoice payments
        </h3>
        {payments.length === 0 ? (
          <p className='text-xs text-muted-foreground'>No recent payments</p>
        ) : (
          <ul className='space-y-2'>
            {payments.map((pmt) => (
              <li key={pmt.id} className='flex items-center justify-between'>
                <div className='min-w-0'>
                  <p className='truncate font-medium'>{pmt.invoice_number}</p>
                  <p className='truncate text-xs text-muted-foreground'>
                    {pmt.date}
                  </p>
                </div>
                <div className='ms-2 shrink-0 text-right text-xs font-semibold tabular-nums'>
                  {pmt.amount_formatted}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className='mb-2 text-xs font-semibold uppercase text-muted-foreground'>
          Recent expense payments
        </h3>
        {expensePayments.length === 0 ? (
          <p className='text-xs text-muted-foreground'>No recent expense payments</p>
        ) : (
          <ul className='space-y-2'>
            {expensePayments.map((ep) => (
              <li key={ep.id} className='flex items-center justify-between'>
                <div className='min-w-0'>
                  <p className='truncate font-medium'>{ep.vender_name}</p>
                  <p className='truncate text-xs text-muted-foreground'>
                    {ep.date}
                  </p>
                </div>
                <div className='ms-2 shrink-0 text-right text-xs font-semibold tabular-nums'>
                  {ep.amount_formatted}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

