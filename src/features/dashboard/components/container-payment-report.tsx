import { useState, useCallback } from 'react'
import { Search, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { invoiceApi, paymentApi } from '@/lib/api'
import { toast } from 'sonner'

export interface ContainerPaymentReportRow {
  id: number
  container_no: string
  invoice_number: string
  customer_name: string
  date: string
  paid_amount: string
  paid_usd: string
  account: string
  reference: string
  sync: string
}

function escapeCsvCell(val: string | number | undefined | null): string {
  const s = String(val ?? '')
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function ContainerPaymentReportPanel() {
  const [containerNo, setContainerNo] = useState('')
  const [rows, setRows] = useState<ContainerPaymentReportRow[]>([])
  const [searchedContainer, setSearchedContainer] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = useCallback(async () => {
    const trimmed = containerNo.trim()
    if (!trimmed) {
      toast.error('Enter a container number.')
      return
    }

    setLoading(true)
    setRows([])
    try {
      const sourceResp = await invoiceApi.getInvoiceNosByContainer(trimmed)
      const invoiceNos: string[] = sourceResp?.invoice_nos || []
      if (!invoiceNos.length) {
        toast.error('No invoices found for this container.')
        return
      }

      const collected: ContainerPaymentReportRow[] = []

      for (const invoiceNo of invoiceNos) {
        let inv: any
        try {
          inv = await invoiceApi.getInvoiceByInvoiceNumber(invoiceNo)
        } catch {
          continue
        }
        if (!inv?.id) {
          continue
        }

        const customerName =
          inv.customer?.name || inv.customer_name || '—'

        let page = 1
        let lastPage = 1
        do {
          const resp = await paymentApi.getPayments({
            invoice_id: inv.id,
            per_page: 100,
            page,
            sort_by: 'date',
            sort_order: 'desc',
          })

          const list = resp.data || []
          for (const p of list) {
            collected.push({
              id: p.id,
              container_no: trimmed,
              invoice_number: inv.invoice_number || invoiceNo,
              customer_name: customerName,
              date: p.date || '—',
              paid_amount: p.amount_formatted || String(p.amount ?? '—'),
              paid_usd: p.amount_usd_formatted || '—',
              account: p.account_name || '—',
              reference: p.reference && p.reference !== '--' ? p.reference : '—',
              sync: String(p.cmts_sync_status ?? '—'),
            })
          }

          lastPage = Number(resp.pagination?.last_page ?? 1)
          page += 1
        } while (page <= lastPage)
      }

      collected.sort((a, b) => b.id - a.id)

      setRows(collected)
      setSearchedContainer(trimmed)
      if (collected.length === 0) {
        toast.message('No payments found for invoices on this container.')
      } else {
        toast.success(`Loaded ${collected.length} payment row(s).`)
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to load container payment report.'
      )
    } finally {
      setLoading(false)
    }
  }, [containerNo])

  const handleExportExcel = useCallback(() => {
    if (!rows.length) {
      toast.error('Run a search with results before exporting.')
      return
    }

    const headers = [
      'Container',
      'Invoice number',
      'Customer',
      'Date',
      'Paid amount',
      'USD',
      'Account',
      'Reference',
      'Sync',
    ]

    const lines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((r) =>
        [
          r.container_no,
          r.invoice_number,
          r.customer_name,
          r.date,
          r.paid_amount,
          r.paid_usd,
          r.account,
          r.reference,
          r.sync,
        ]
          .map(escapeCsvCell)
          .join(',')
      ),
    ]

    const safeName = searchedContainer.replace(/[^\w.-]+/g, '_').slice(0, 80)
    const stamp = new Date().toISOString().slice(0, 10)
    const blob = new Blob(['\ufeff' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `container-payment-report_${safeName}_${stamp}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('File downloaded (open with Microsoft Excel).')
  }, [rows, searchedContainer])

  return (
    <div className='flex flex-col gap-4 min-h-0'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
        <div className='flex-1 space-y-2'>
          <Label htmlFor='container-payment-no'>Container number</Label>
          <Input
            id='container-payment-no'
            placeholder='e.g. ABCD1234567'
            value={containerNo}
            onChange={(e) => setContainerNo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSearch()
            }}
            disabled={loading}
          />
        </div>
        <Button
          type='button'
          className='sm:shrink-0'
          onClick={() => void handleSearch()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Search className='mr-2 h-4 w-4' />
          )}
          Search
        </Button>
      </div>

      <div className='rounded-md border overflow-auto max-h-[min(420px,50vh)]'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-10'>S/N</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>USD</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={9} className='text-center text-muted-foreground py-8'>
                  Enter a container number and click Search to load payments.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={`${r.id}-${r.invoice_number}-${i}`}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className='font-medium whitespace-nowrap'>
                    {r.invoice_number}
                  </TableCell>
                  <TableCell>{r.customer_name}</TableCell>
                  <TableCell className='whitespace-nowrap'>{r.date}</TableCell>
                  <TableCell>{r.paid_amount}</TableCell>
                  <TableCell>{r.paid_usd}</TableCell>
                  <TableCell className='max-w-[140px] truncate' title={r.account}>
                    {r.account}
                  </TableCell>
                  <TableCell className='max-w-[120px] truncate' title={r.reference}>
                    {r.reference}
                  </TableCell>
                  <TableCell className='capitalize'>{r.sync}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex justify-end pt-1'>
        <Button
          type='button'
          variant='secondary'
          onClick={handleExportExcel}
          disabled={!rows.length || loading}
        >
          <Download className='mr-2 h-4 w-4' />
          Export Excel (CSV)
        </Button>
      </div>
    </div>
  )
}
