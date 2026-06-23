import { customerApi, invoiceApi } from '@/lib/api'

type InvoiceRow = {
  id: number
  invoice_number: string
  issue_date: string
  due_date: string
  amount?: number
  paid_amount?: number
  due_amount?: number
  status_label?: string
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function wholeNumberValue(value: unknown): string {
  if (!Number.isFinite(Number(value))) return ''
  return String(Math.round(Number(value)))
}

async function fetchAllCustomerInvoices(customerId: number): Promise<InvoiceRow[]> {
  const perPage = 200
  let page = 1
  const all: InvoiceRow[] = []

  while (true) {
    const response = await customerApi.getCustomerInvoices(customerId, {
      page,
      per_page: perPage,
    })
    all.push(...(response.data || []))

    if (!response.pagination || page >= response.pagination.last_page) break
    page += 1
  }

  return all
}

async function fetchInvoiceContainers(invoices: InvoiceRow[]): Promise<Record<number, string>> {
  const entries = await Promise.all(
    invoices.map(async (invoice) => {
      try {
        const resp = await invoiceApi.getInvoiceContainerDetails(invoice.invoice_number)
        if (resp?.status && Array.isArray(resp.containers) && resp.containers.length > 0) {
          const text = resp.containers
            .map((c: { container_no?: string }) => String(c.container_no ?? '').trim())
            .filter(Boolean)
            .join(', ')
          return [invoice.id, text || '-'] as const
        }
      } catch {
        // ignore and treat as no containers
      }
      return [invoice.id, '-'] as const
    })
  )

  return Object.fromEntries(entries)
}

function triggerCsvDownload(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportCustomerInvoicesCsv(params: {
  customerId: number
  customerName: string
  customerNumber?: string
}): Promise<number> {
  const invoices = await fetchAllCustomerInvoices(params.customerId)
  if (invoices.length === 0) return 0

  const containers = await fetchInvoiceContainers(invoices)
  const header = [
    'Invoice Number',
    'Container Number',
    'Issue Date',
    'Due Date',
    'Amount',
    'Paid Amount',
    'Due Amount',
    'Status',
  ]

  const lines = invoices.map((invoice) =>
    [
      csvEscape(invoice.invoice_number),
      csvEscape(containers[invoice.id] ?? '-'),
      csvEscape(invoice.issue_date ?? ''),
      csvEscape(invoice.due_date ?? ''),
      csvEscape(wholeNumberValue(invoice.amount)),
      csvEscape(wholeNumberValue(invoice.paid_amount)),
      csvEscape(wholeNumberValue(invoice.due_amount)),
      csvEscape(invoice.status_label ?? ''),
    ].join(',')
  )

  const totals = invoices.reduce(
    (acc, invoice) => ({
      amount: acc.amount + (Number(invoice.amount) || 0),
      paid_amount: acc.paid_amount + (Number(invoice.paid_amount) || 0),
      due_amount: acc.due_amount + (Number(invoice.due_amount) || 0),
    }),
    { amount: 0, paid_amount: 0, due_amount: 0 }
  )

  const totalsLine = [
    csvEscape('TOTAL'),
    csvEscape(''),
    csvEscape(''),
    csvEscape(''),
    csvEscape(wholeNumberValue(totals.amount)),
    csvEscape(wholeNumberValue(totals.paid_amount)),
    csvEscape(wholeNumberValue(totals.due_amount)),
    csvEscape(''),
  ].join(',')

  const date = new Date().toISOString().slice(0, 10)
  const safeCustomerName =
    (params.customerName || 'customer')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'customer'
  const filename = `${safeCustomerName}_invoices_${date}.csv`

  triggerCsvDownload(filename, [header.join(','), ...lines, totalsLine].join('\n'))
  return invoices.length
}
