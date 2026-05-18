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
  due?: number
  status: number
  status_label?: string
}

type Row = {
  source: SourceInvoice
  torchlight: TorchlightInvoiceDetails | null
  selected: boolean
}

function roundOffAmount(value: number | null | undefined): number {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.round(amount)
}

function invoiceHasPayments(torch: TorchlightInvoiceDetails): boolean {
  const total = roundOffAmount(torch.amount)
  const due = roundOffAmount(torch.due ?? torch.amount)
  return Math.abs(due - total) >= 0.02
}

function getPaidInvoicesOnContainer(rows: Row[]): string[] {
  return rows
    .filter((r) => r.torchlight && invoiceHasPayments(r.torchlight))
    .map((r) => r.source.invoice_no)
}

/** Sent (1), no payments, present in Torchlight; blocked when container has any paid invoice. */
function isRowUnpostable(row: Row, containerBlocked: boolean): boolean {
  if (containerBlocked) return false
  if (!row.torchlight || row.torchlight.status !== 1) return false
  return !invoiceHasPayments(row.torchlight)
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  const runWorker = async () => {
    while (true) {
      const current = nextIndex
      nextIndex += 1
      if (current >= items.length) return
      results[current] = await worker(items[current], current)
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => runWorker())
  await Promise.all(workers)
  return results
}

async function fetchInvoiceWithRetry(invoiceNo: string, maxAttempts: number = 3) {
  let lastError: unknown = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const torch = await invoiceApi.getInvoiceByInvoiceNumber(invoiceNo)
      return torch as TorchlightInvoiceDetails
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
      }
    }
  }
  throw lastError
}

export function UnpostInvoicesModal({
  open,
  onOpenChange,
  onUnposted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUnposted?: () => Promise<void> | void
}) {
  const [containerNo, setContainerNo] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paidInvoiceNosOnContainer, setPaidInvoiceNosOnContainer] = useState<string[]>([])

  const containerBlocked = paidInvoiceNosOnContainer.length > 0

  useEffect(() => {
    if (!open) {
      setContainerNo('')
      setRows([])
      setPaidInvoiceNosOnContainer([])
      setIsFetching(false)
      setIsSubmitting(false)
    }
  }, [open])

  const unpostableRows = useMemo(
    () => rows.filter((r) => isRowUnpostable(r, containerBlocked)),
    [rows, containerBlocked]
  )
  const selectedCount = useMemo(
    () =>
      rows.filter((r) => r.selected && isRowUnpostable(r, containerBlocked)).length,
    [rows, containerBlocked]
  )
  const allSelected =
    unpostableRows.length > 0 && unpostableRows.every((r) => r.selected)

  const formatAmount = (n: number) => {
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
      setPaidInvoiceNosOnContainer([])

      const sourceResp = await invoiceApi.getInvoiceNosByContainer(trimmed)
      const sourceInvoices: SourceInvoice[] = sourceResp?.invoices || []

      if (!sourceInvoices?.length) {
        toast.error('No invoices found for this container.')
        return
      }

      const torchlightResults = await mapWithConcurrency(
        sourceInvoices,
        async (inv) => {
          try {
            const torch = await fetchInvoiceWithRetry(inv.invoice_no, 3)
            return { source: inv, torchlight: torch }
          } catch {
            return { source: inv, torchlight: null }
          }
        },
        4
      )

      const mappedRows: Row[] = torchlightResults.map((res) => ({
        source: res.source,
        torchlight: res.torchlight,
        selected: false,
      }))

      const paidOnContainer = getPaidInvoicesOnContainer(mappedRows)
      setPaidInvoiceNosOnContainer(paidOnContainer)

      if (paidOnContainer.length > 0) {
        setRows(mappedRows)
        toast.error(
          `Cannot unpost: this container has paid invoice(s): ${paidOnContainer.join(', ')}`
        )
        return
      }

      const nextRows: Row[] = mappedRows.map((row) => ({
        ...row,
        selected: isRowUnpostable(row, false),
      }))

      setRows(nextRows)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to load invoices for container.')
    } finally {
      setIsFetching(false)
    }
  }

  const toggleRow = (index: number, value: boolean) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r
        if (!isRowUnpostable(r, containerBlocked)) return { ...r, selected: false }
        return { ...r, selected: value }
      })
    )
  }

  const toggleAll = (value: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        isRowUnpostable(r, containerBlocked) ? { ...r, selected: value } : { ...r, selected: false }
      )
    )
  }

  const handleSubmit = async () => {
    if (containerBlocked) {
      toast.error(
        `Cannot unpost: this container has paid invoice(s): ${paidInvoiceNosOnContainer.join(', ')}`
      )
      return
    }

    const selectedIds = rows
      .filter((r) => r.selected && isRowUnpostable(r, false))
      .map((r) => r.torchlight!.id)

    if (selectedIds.length === 0) {
      toast.error('No invoices selected to unpost.')
      return
    }

    const confirmed = window.confirm(
      `Unpost ${selectedIds.length} invoice(s) for container ${containerNo.trim()}? They will return to draft and customer balances will be reversed.`
    )
    if (!confirmed) return

    try {
      setIsSubmitting(true)
      const response = await invoiceApi.bulkUnpost(selectedIds, {
        container_no: containerNo.trim(),
      })

      if (response.status === 200) {
        toast.success(
          `Unposted ${response.data?.unposted_count ?? selectedIds.length} invoice(s) back to draft. ${
            response.data?.skipped_count > 0 ? `${response.data.skipped_count} skipped.` : ''
          }`
        )
        await onUnposted?.()
        onOpenChange(false)
      } else if (response.status === 422) {
        const paid = (response.data?.paid_invoices || []) as Array<{
          invoice_number?: string
        }>
        const paidNos = paid
          .map((p) => p.invoice_number)
          .filter((n): n is string => Boolean(n))
        if (paidNos.length) {
          setPaidInvoiceNosOnContainer(paidNos)
        }
        toast.error(response.message || 'Cannot unpost: container has paid invoice(s).')
      } else {
        toast.error(response.message || 'Failed to unpost invoices')
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to unpost invoices')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] overflow-y-auto sm:max-w-[95vw]!'>
        <DialogHeader>
          <DialogTitle>Unpost Invoices</DialogTitle>
          <DialogDescription>
            Load invoices by container. Unpost is only allowed when{' '}
            <span className='font-medium'>no invoice on the container has any payment</span>. Eligible
            rows must be <span className='font-medium'>Sent</span>, fully unpaid, and posted for this
            container.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-12 gap-4 items-end'>
            <div className='md:col-span-7'>
              <Label htmlFor='unpost_container_no'>Container number</Label>
              <Input
                id='unpost_container_no'
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
                onClick={() => void loadInvoicesForContainer()}
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
                variant='destructive'
                onClick={() => void handleSubmit()}
                disabled={
                  isSubmitting ||
                  containerBlocked ||
                  rows.length === 0 ||
                  selectedCount === 0
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Unposting...
                  </>
                ) : (
                  'Unpost to draft'
                )}
              </Button>
            </div>
          </div>

          {rows.length > 0 && (
            <>
              {containerBlocked && (
                <div className='rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                  Cannot unpost this container: paid invoice(s){' '}
                  <span className='font-mono font-medium'>
                    {paidInvoiceNosOnContainer.join(', ')}
                  </span>
                  . All invoices on the container must be unpaid before any can be reverted to draft.
                </div>
              )}

              {!containerBlocked && unpostableRows.length === 0 && (
                <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100'>
                  No sent, unpaid invoices for this container can be unposted. Invoices may still be
                  draft, already paid, or were not posted with this container number.
                </div>
              )}

              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[60px]'>Unpost</TableHead>
                      <TableHead>Invoice number</TableHead>
                      <TableHead>Customer</TableHead>
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
                          disabled={unpostableRows.length === 0}
                          aria-label='Select all unpostable invoices'
                        />
                      </TableCell>
                      <TableCell colSpan={5} className='text-sm text-muted-foreground'>
                        {selectedCount} invoice(s) selected to unpost
                        {unpostableRows.length < rows.length && (
                          <span className='ml-2'>
                            ({rows.length - unpostableRows.length} not eligible)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    {rows.map((row, idx) => {
                      const hasPayment =
                        row.torchlight != null && invoiceHasPayments(row.torchlight)
                      const unpostable = isRowUnpostable(row, containerBlocked)
                      return (
                        <TableRow
                          key={row.source.invoice_no}
                          className={!unpostable ? 'opacity-75' : undefined}
                        >
                          <TableCell>
                            <Checkbox
                              checked={row.selected}
                              disabled={!unpostable}
                              onCheckedChange={(v) => toggleRow(idx, Boolean(v))}
                            />
                          </TableCell>
                          <TableCell className='font-mono font-medium'>
                            {row.source.invoice_no}
                          </TableCell>
                          <TableCell>
                            {row.torchlight?.customer?.name || row.source.customer_name}
                          </TableCell>
                          <TableCell>
                            {row.torchlight?.subject || row.source.description || '—'}
                          </TableCell>
                          <TableCell className='text-right'>
                            {formatAmount(
                              row.torchlight?.amount ?? row.source.source_amount
                            )}
                          </TableCell>
                          <TableCell>
                            {!row.torchlight ? (
                              <Badge variant='secondary'>Not in Torchlight</Badge>
                            ) : hasPayment ? (
                              <Badge variant='destructive'>Paid / partial</Badge>
                            ) : unpostable ? (
                              <Badge variant='outline' className='bg-yellow-500/10'>
                                {row.torchlight.status_label ?? 'Sent'}
                              </Badge>
                            ) : (
                              <Badge variant='secondary'>
                                {row.torchlight.status_label ?? 'Not eligible'}
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
          <p className='text-sm text-muted-foreground pt-2'>
            Enter the container number used when posting, then click{' '}
            <span className='font-medium'>Load Invoices</span>.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
