import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { invoiceApi } from '@/lib/api'

type SourceInvoice = {
  invoice_no: string
  customer_name: string
  description: string
  source_amount: number
}

type TorchlightInvoiceDetails = {
  id: number
  invoice_number: string
  subject: string
  customer: { name: string }
  amount: number
  amount_formatted: string
  status: number
}

type Row = {
  source: SourceInvoice
  torchlight: TorchlightInvoiceDetails | null
  selected: boolean
  mismatch: boolean
}

export function PostInvoicesModal({
  open,
  onOpenChange,
  onPosted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPosted?: () => Promise<void> | void
}) {
  const [containerNo, setContainerNo] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setContainerNo('')
      setRows([])
      setIsFetching(false)
      setIsSubmitting(false)
    }
  }, [open])

  const selectedCount = useMemo(
    () => rows.filter((r) => r.selected).length,
    [rows]
  )

  const allSelected = rows.length > 0 && rows.every((r) => r.selected)

  const formatSourceAmount = (n: number) => {
    if (typeof n !== 'number' || Number.isNaN(n)) return '0.00'
    return n.toFixed(2)
  }

  const loadInvoicesForContainer = async () => {
    const trimmed = containerNo.trim()
    if (!trimmed) {
      toast.error('Container number is required.')
      return
    }

    try {
      setIsFetching(true)
      setRows([])

      const sourceResp = await invoiceApi.getInvoiceNosByContainer(trimmed)
      const sourceInvoices: SourceInvoice[] = sourceResp?.invoices || []

      if (!sourceInvoices || sourceInvoices.length === 0) {
        toast.error('No invoices found for this container.')
        return
      }

      // Fetch torchlight invoice details for each invoice number
      const torchlightResults = await Promise.all(
        sourceInvoices.map(async (inv) => {
          try {
            const torch = await invoiceApi.getInvoiceByInvoiceNumber(inv.invoice_no)
            return { source: inv, torchlight: torch as TorchlightInvoiceDetails }
          } catch (e) {
            return { source: inv, torchlight: null }
          }
        })
      )

      const nextRows: Row[] = torchlightResults.map((res) => {
        const torchAmount = res.torchlight?.amount ?? null
        const sourceAmount = res.source.source_amount ?? 0

        const mismatch =
          torchAmount === null ? false : Math.abs(sourceAmount - torchAmount) > 0.01

        return {
          source: res.source,
          torchlight: res.torchlight,
          selected: true,
          mismatch,
        }
      })

      setRows(nextRows)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load invoices for container.')
    } finally {
      setIsFetching(false)
    }
  }

  const toggleRow = (index: number, value: boolean) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: value } : r))
    )
  }

  const toggleAll = (value: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: value })))
  }

  const handleSubmit = async () => {
    const selectedIds = rows
      .filter((r) => r.selected)
      .map((r) => r.torchlight?.id)
      .filter((id): id is number => typeof id === 'number')

    if (selectedIds.length === 0) {
      toast.error('No invoices selected to post.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await invoiceApi.bulkPost(selectedIds)

      if (response.status === 200) {
        toast.success(
          `Successfully posted ${response.data.posted_count} invoice(s). ${
            response.data.skipped_count > 0 ? `${response.data.skipped_count} skipped.` : ''
          }`
        )
        await onPosted?.()
        onOpenChange(false)
      } else {
        toast.error(response.message || 'Failed to post invoices')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to post invoices')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] overflow-y-auto sm:max-w-[95vw]!'>
        <DialogHeader>
          <DialogTitle>Post Invoices</DialogTitle>
          <DialogDescription>
            Enter a container number to load invoices from the source system and post matching draft invoices.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-12 gap-4 items-end'>
            <div className='md:col-span-7'>
              <Label htmlFor='container_no'>Container number</Label>
              <Input
                id='container_no'
                value={containerNo}
                onChange={(e) => setContainerNo(e.target.value)}
                placeholder='e.g. ABCD1234567'
                className='mt-2'
              />
            </div>
            <div className='md:col-span-5 flex gap-2 justify-end'>
              <Button
                variant='outline'
                type='button'
                onClick={loadInvoicesForContainer}
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Loading...
                  </>
                ) : (
                  'Load Invoices'
                )}
              </Button>
              <Button
                type='button'
                variant='default'
                onClick={handleSubmit}
                disabled={isSubmitting || rows.length === 0 || selectedCount === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Posting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </div>

          {rows.length > 0 && (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[60px]'>Post</TableHead>
                    <TableHead>Invoice number</TableHead>
                    <TableHead>Customer name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className='text-right'>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => toggleAll(Boolean(v))}
                        aria-label='Select all invoices'
                      />
                    </TableCell>
                    <TableCell colSpan={4} className='text-sm text-muted-foreground'>
                      {selectedCount} selected
                    </TableCell>
                  </TableRow>
                  {rows.map((row, idx) => {
                    const torchAmountFormatted = row.torchlight?.amount_formatted
                    const sourceAmount = formatSourceAmount(row.source.source_amount)
                    const torchAmount = row.torchlight ? row.torchlight.amount : null

                    return (
                      <TableRow key={row.source.invoice_no}>
                        <TableCell>
                          <Checkbox
                            checked={row.selected}
                            onCheckedChange={(v) => toggleRow(idx, Boolean(v))}
                            aria-label={`Select invoice ${row.source.invoice_no}`}
                          />
                        </TableCell>
                        <TableCell className='font-mono font-medium'>
                          {row.source.invoice_no}
                        </TableCell>
                        <TableCell>{row.torchlight?.customer?.name || row.source.customer_name}</TableCell>
                        <TableCell>
                          {row.torchlight?.subject || row.source.description || '-'}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex items-end justify-end gap-2'>
                            <div className='text-sm'>
                              <div className='text-muted-foreground'>Source: {sourceAmount}</div>
                              <div>
                                Torchlight:{' '}
                                {torchAmountFormatted || (torchAmount !== null ? torchAmount : '-')}
                              </div>
                            </div>
                            {row.mismatch && (
                              <Badge variant='destructive'>Mismatch</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {rows.length === 0 && !isFetching && (
          <div className='text-sm text-muted-foreground pt-2'>
            Enter a container number and click <span className='font-medium'>Load Invoices</span>.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

