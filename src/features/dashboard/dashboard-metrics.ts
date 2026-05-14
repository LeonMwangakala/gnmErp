import { invoiceApi, paymentApi } from '@/lib/api'

/** Posted / unpaid / partial / paid — excludes draft (0). */
const INVOICE_NON_DRAFT_STATUSES = [1, 2, 3, 4]

const PAGE_SIZE = 100
/** Parallel page fetches per round (bounded to avoid hammering the API). */
const PAGE_FETCH_CONCURRENCY = 8

function sumInvoiceAmountRows(rows: { amount?: number }[]): number {
  let s = 0
  for (const inv of rows) {
    s += typeof inv.amount === 'number' ? inv.amount : Number(inv.amount ?? 0)
  }
  return s
}


/**
 * Sum invoice totals for the creator's invoices in `issue_date` range (Torchlight
 * `issue_date` param: `YYYY-MM-DD to YYYY-MM-DD`). Fetches pages in parallel batches.
 */
export async function sumInvoiceTotalsNonDraftForIssueDateRange(issueDateRange: string): Promise<number> {
  const base = {
    per_page: PAGE_SIZE,
    sort_by: 'issue_date' as const,
    sort_order: 'desc' as const,
    status: INVOICE_NON_DRAFT_STATUSES,
    issue_date: issueDateRange,
  }
  const first = await invoiceApi.getInvoices({ page: 1, ...base })
  let sum = sumInvoiceAmountRows(first.data as { amount?: number }[])
  const lastPage = first.pagination.last_page

  for (let batchStart = 2; batchStart <= lastPage; batchStart += PAGE_FETCH_CONCURRENCY) {
    const batchEnd = Math.min(batchStart + PAGE_FETCH_CONCURRENCY - 1, lastPage)
    const pages: number[] = []
    for (let p = batchStart; p <= batchEnd; p++) pages.push(p)
    const results = await Promise.all(pages.map((page) => invoiceApi.getInvoices({ page, ...base })))
    for (const res of results) {
      sum += sumInvoiceAmountRows(res.data as { amount?: number }[])
    }
  }
  return sum
}

/** Sum payment amounts (USD basis) for the inclusive date range — one API call. */
export async function sumInvoicePaymentsForDateRange(dateFrom: string, dateTo: string): Promise<number> {
  return paymentApi.getPaymentsMonthUsdTotal({ date_from: dateFrom, date_to: dateTo })
}
