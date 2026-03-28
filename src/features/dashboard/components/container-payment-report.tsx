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
import { invoiceApi } from '@/lib/api'
import { toast } from 'sonner'
import type { InvoiceConsignmentsGoodsPayload } from '@/features/invoices/invoice-consignments-goods-modal'

export interface ContainerInvoiceReportRow {
  invoice_id: number
  invoice_number: string
  /** customer_name: container_no, Packages, Goods */
  customer_detail: string
  amount: string
  discount: string
  net_sales: string
  paid: string
  balance: string
}

/**
 * customer_name: container_no, Packages, Goods_name
 */
function buildCustomerDetail(
  customerName: string,
  containerNoSearched: string,
  payload: InvoiceConsignmentsGoodsPayload | null
): string {
  const name = customerName?.trim() || '—'

  if (!payload?.status || !payload.consignments?.length) {
    return `${name}: ${containerNoSearched}, —, —`
  }

  let pkgsSum = 0
  const goodNames: string[] = []

  for (const block of payload.consignments) {
    const lines = block.good_consignments || []
    for (const line of lines) {
      pkgsSum += Number(line.pkgs) || 0
      const g = line.good as Record<string, unknown> | undefined
      const gn = g?.name
      if (gn != null && String(gn).trim() !== '') {
        goodNames.push(String(gn).trim())
      }
    }
  }

  const goodsStr =
    goodNames.length > 0 ? [...new Set(goodNames)].join('; ') : '—'
  const pkgsStr = pkgsSum > 0 ? String(pkgsSum) : '—'

  return `${name}: ${containerNoSearched}, ${pkgsStr}, ${goodsStr}`
}

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
  const [rows, setRows] = useState<ContainerInvoiceReportRow[]>([])
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

      const collected: ContainerInvoiceReportRow[] = []

      for (const invoiceNo of invoiceNos) {
        let invBrief: { id?: number } | null = null
        try {
          invBrief = await invoiceApi.getInvoiceByInvoiceNumber(invoiceNo)
        } catch {
          continue
        }
        if (!invBrief?.id) {
          continue
        }

        const [invDetail, cgPayload] = await Promise.all([
          invoiceApi.getInvoice(invBrief.id),
          invoiceApi
            .getInvoiceConsignmentsGoods(invoiceNo)
            .catch((): InvoiceConsignmentsGoodsPayload | null => null),
        ])

        const totals = invDetail?.totals
        if (!totals) {
          continue
        }

        const total = Number(totals.total ?? 0)
        const tax = Number(totals.tax ?? 0)
        const subtotal = Number(totals.subtotal ?? 0)
        const discountNum = Number(totals.discount ?? 0)
        const paidNum = Number(totals.paid ?? 0)
        const dueNum = Number(totals.due ?? 0)

        // Amount: API subtotal (= total - tax + discount) — gross pre-tax before invoice discount net
        const amountStr =
          totals.subtotal_formatted ?? formatMoney(subtotal)
        const discountStr =
          totals.discount_formatted ?? formatMoney(discountNum)
        // Net sales = amount - discount (pre-tax net after all discounts)
        const netSalesNum = total - tax
        const netSalesStr = formatMoney(netSalesNum)

        const paidStr = totals.paid_formatted ?? formatMoney(paidNum)
        const balanceStr = totals.due_formatted ?? formatMoney(dueNum)

        const customerName = invDetail?.customer?.name || '—'

        const customerDetail = buildCustomerDetail(
          customerName,
          trimmed,
          cgPayload && typeof cgPayload === 'object' && 'status' in cgPayload
            ? (cgPayload as InvoiceConsignmentsGoodsPayload)
            : null
        )

        collected.push({
          invoice_id: invBrief.id,
          invoice_number: invDetail.invoice_number || invoiceNo,
          customer_detail: customerDetail,
          amount: amountStr,
          discount: discountStr,
          net_sales: netSalesStr,
          paid: paidStr,
          balance: balanceStr,
        })
      }

      collected.sort((a, b) =>
        a.invoice_number.localeCompare(b.invoice_number, undefined, {
          numeric: true,
        })
      )

      setRows(collected)
      setSearchedContainer(trimmed)
      if (collected.length === 0) {
        toast.message('No invoice rows could be loaded for this container.')
      } else {
        toast.success(`Loaded ${collected.length} invoice(s).`)
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
      'Invoice No',
      'Customer (container / pkgs / goods)',
      'Amount',
      'Discount',
      'Net sales',
      'Paid amount',
      'Balance',
    ]

    const lines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((r) =>
        [
          r.invoice_number,
          r.customer_detail,
          r.amount,
          r.discount,
          r.net_sales,
          r.paid,
          r.balance,
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
              <TableHead>Invoice No</TableHead>
              <TableHead className='min-w-[220px]'>
                Customer (name: container, packages, goods)
              </TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Net sales</TableHead>
              <TableHead>Paid amount</TableHead>
              <TableHead>Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-center text-muted-foreground py-8'
                >
                  Enter a container number and click Search to load invoices.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.invoice_id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className='font-medium whitespace-nowrap'>
                    {r.invoice_number}
                  </TableCell>
                  <TableCell className='text-sm max-w-[min(360px,40vw)] align-top'>
                    <span className='line-clamp-4' title={r.customer_detail}>
                      {r.customer_detail}
                    </span>
                  </TableCell>
                  <TableCell className='whitespace-nowrap text-right'>
                    {r.amount}
                  </TableCell>
                  <TableCell className='whitespace-nowrap text-right'>
                    {r.discount}
                  </TableCell>
                  <TableCell className='whitespace-nowrap text-right'>
                    {r.net_sales}
                  </TableCell>
                  <TableCell className='whitespace-nowrap text-right'>
                    {r.paid}
                  </TableCell>
                  <TableCell className='whitespace-nowrap text-right'>
                    {r.balance}
                  </TableCell>
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
