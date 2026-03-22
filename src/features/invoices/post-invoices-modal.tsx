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
  status_label?: string
}

type Row = {
  source: SourceInvoice
  torchlight: TorchlightInvoiceDetails | null
  selected: boolean
  mismatch: boolean
}

/** Only Draft (0) invoices can be bulk-posted; already sent/posted must stay disabled. */
function isRowPostable(row: Row): boolean {
  return row.torchlight !== null && row.torchlight.status === 0
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

  const postableRows = useMemo(() => rows.filter(isRowPostable), [rows])

  const selectedCount = useMemo(
    () => rows.filter((r) => r.selected && isRowPostable(r)).length,
    [rows]
  )
  const mismatchCount = useMemo(
    () => rows.filter((r) => r.mismatch).length,
    [rows]
  )
  const selectedMismatchCount = useMemo(
    () => rows.filter((r) => r.selected && isRowPostable(r) && r.mismatch).length,
    [rows]
  )

  const allSelected =
    postableRows.length > 0 && postableRows.every((r) => r.selected)

  const formatSourceAmount = (n: number) => {
    if (typeof n !== 'number' || Number.isNaN(n)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
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

        const row: Row = {
          source: res.source,
          torchlight: res.torchlight,
          selected: false,
          mismatch,
        }
        return {
          ...row,
          selected: isRowPostable(row),
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
      prev.map((r, i) => {
        if (i !== index) return r
        if (!isRowPostable(r)) return { ...r, selected: false }
        return { ...r, selected: value }
      })
    )
  }

  const toggleAll = (value: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        isRowPostable(r) ? { ...r, selected: value } : { ...r, selected: false }
      )
    )
  }

  const handleSubmit = async () => {
    const selectedIds = rows
      .filter((r) => r.selected && isRowPostable(r))
      .map((r) => r.torchlight!.id)

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
            Load invoices by container. Only <span className='font-medium'>Draft</span> invoices in Torchlight can be
            selected and posted; already sent or posted invoices stay visible but disabled.
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
            <>
              {rows.length > 0 && postableRows.length === 0 && (
                <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100'>
                  <span className='font-medium'>No draft invoices to post.</span>{' '}
                  <span className='text-muted-foreground'>
                    All matching Torchlight invoices are already sent or not found. Nothing can be submitted.
                  </span>
                </div>
              )}

              {mismatchCount > 0 && (
                <div className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm'>
                  <span className='font-medium text-destructive'>
                    {mismatchCount} invoice(s) have amount differences.
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    Review rows marked <Badge variant='destructive' className='mx-1'>Mismatch</Badge> before posting.
                    {selectedMismatchCount > 0 && ` ${selectedMismatchCount} mismatched invoice(s) are currently selected.`}
                  </span>
                </div>
              )}

              <div className='rounded-md border'>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[60px]'>Post</TableHead>
                    <TableHead>Invoice number</TableHead>
                    <TableHead>Customer name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className='text-right'>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => toggleAll(Boolean(v))}
                        disabled={postableRows.length === 0}
                        aria-label='Select all draft invoices'
                      />
                    </TableCell>
                    <TableCell colSpan={5} className='text-sm text-muted-foreground'>
                      {selectedCount} draft invoice(s) selected
                      {postableRows.length < rows.length && (
                        <span className='ml-2'>
                          ({rows.length - postableRows.length} not postable — already sent or missing)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  {rows.map((row, idx) => {
                    const torchAmountFormatted = row.torchlight?.amount_formatted
                    const sourceAmount = formatSourceAmount(row.source.source_amount)
                    const torchAmount = row.torchlight ? row.torchlight.amount : null

                    const postable = isRowPostable(row)

                    return (
                      <TableRow
                        key={row.source.invoice_no}
                        className={
                          row.mismatch && postable
                            ? 'bg-destructive/5'
                            : !postable
                              ? 'opacity-80'
                              : undefined
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={row.selected}
                            disabled={!postable}
                            onCheckedChange={(v) => toggleRow(idx, Boolean(v))}
                            aria-label={
                              postable
                                ? `Select invoice ${row.source.invoice_no}`
                                : `Invoice ${row.source.invoice_no} cannot be posted`
                            }
                          />
                        </TableCell>
                        <TableCell className='font-mono font-medium'>
                          {row.source.invoice_no}
                          {row.mismatch && (
                            <Badge variant='destructive' className='ml-2'>
                              Mismatch
                            </Badge>
                          )}
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
                          </div>
                        </TableCell>
                        <TableCell>
                          {!row.torchlight ? (
                            <Badge variant='secondary'>Not in Torchlight</Badge>
                          ) : postable ? (
                            <Badge variant='outline' className='bg-slate-100 dark:bg-slate-800'>
                              {row.torchlight.status_label ?? 'Draft'}
                            </Badge>
                          ) : (
                            <Badge variant='secondary'>
                              {row.torchlight.status_label ?? 'Posted'}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                </Table>
              </div>
            </>
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

