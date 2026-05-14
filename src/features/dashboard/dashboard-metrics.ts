import { invoiceApi, paymentApi } from '@/lib/api'

/** Posted / unpaid / partial / paid — excludes draft (0). */
const INVOICE_NON_DRAFT_STATUSES = [1, 2, 3, 4]

/**
 * Sum invoice totals for the creator's invoices in `issue_date` range (Torchlight
 * `issue_date` param: `YYYY-MM-DD to YYYY-MM-DD`). Paginates until all pages are read.
 */
export async function sumInvoiceTotalsNonDraftForIssueDateRange(issueDateRange: string): Promise<number> {
  let sum = 0
  let page = 1
  let lastPage = 1
  do {
    const res = await invoiceApi.getInvoices({
      page,
      per_page: 100,
      sort_by: 'issue_date',
      sort_order: 'desc',
      status: INVOICE_NON_DRAFT_STATUSES,
      issue_date: issueDateRange,
    })
    for (const inv of res.data as { amount?: number }[]) {
      sum += typeof inv.amount === 'number' ? inv.amount : Number(inv.amount ?? 0)
    }
    lastPage = res.pagination.last_page
    page += 1
  } while (page <= lastPage)
  return sum
}

/** Sum payment amounts in USD equivalent (`amount_usd` from API; mixed-currency safe). */
export async function sumInvoicePaymentsForDateRange(dateFrom: string, dateTo: string): Promise<number> {
  let sum = 0
  let page = 1
  let lastPage = 1
  do {
    const res = await paymentApi.getPayments({
      page,
      per_page: 100,
      sort_by: 'date',
      sort_order: 'desc',
      date_from: dateFrom,
      date_to: dateTo,
    })
    for (const pmt of res.data as { amount_usd?: number; amount?: number }[]) {
      sum += Number(pmt.amount_usd ?? pmt.amount ?? 0)
    }
    lastPage = res.pagination.last_page
    page += 1
  } while (page <= lastPage)
  return sum
}
