import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { invoiceApi } from '@/lib/api'
import { formatMoney } from '@/lib/utils'

export type ZeroPartialInvoiceRow = {
  id: number
  invoice_number: string
  customer_name?: string
  amount: number
  paid_amount: number
  credit_note_amount?: number
  balance: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied?: () => void
}

/** Matches backend InvoiceStatusService::DEFAULT_ZERO_EPSILON (rounded currency balance). */
const EPSILON = 1

export function MarkZeroPartialPaidModal({ open, onOpenChange, onApplied }: Props) {
  const [rows, setRows] = useState<ZeroPartialInvoiceRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const allSelected = useMemo(
    () => rows.length > 0 && selectedIds.size === rows.length,
    [rows.length, selectedIds.size]
  )

  const someSelected = selectedIds.size > 0 && !allSelected

  const loadPreview = useCallback(async () => {
    setIsLoadingPreview(true)
    setPreviewError(null)
    try {
      const response = await invoiceApi.markZeroPartialPaid(EPSILON, true)
      if (response?.status === 200) {
        const list = (response?.data?.invoices ?? []) as ZeroPartialInvoiceRow[]
        const nextRows = Array.isArray(list) ? list : []
        setRows(nextRows)
        setSelectedIds(new Set(nextRows.map((row) => row.id)))
      } else {
        setRows([])
        setSelectedIds(new Set())
        setPreviewError(response?.message || 'Failed to load preview')
      }
    } catch (error: unknown) {
      setRows([])
      setSelectedIds(new Set())
      const err = error as { response?: { data?: { message?: string } } }
      setPreviewError(err?.response?.data?.message || 'Failed to load preview')
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      void loadPreview()
    } else {
      setRows([])
      setSelectedIds(new Set())
      setPreviewError(null)
      setIsApplying(false)
    }
  }, [open, loadPreview])

  const toggleRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(rows.map((row) => row.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleReject = () => {
    onOpenChange(false)
  }

  const handleAccept = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.error('Select at least one invoice.')
      return
    }

    try {
      setIsApplying(true)
      const response = await invoiceApi.markZeroPartialPaid(EPSILON, false, ids)
      if (response?.status === 200) {
        const count = Number(response?.data?.updated_count ?? 0)
        toast.success(response?.message || `Updated ${count} invoice(s).`)
        onOpenChange(false)
        onApplied?.()
      } else {
        toast.error(response?.message || 'Failed to update invoice statuses')
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Failed to update invoice statuses')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] flex flex-col overflow-hidden sm:max-w-[95vw]! md:max-w-[90vw]! lg:max-w-[85vw]!'>
        <DialogHeader>
          <DialogTitle>Mark zero-balance partials as paid</DialogTitle>
          <DialogDescription>
            Partial Paid invoices whose balance rounds to zero or is at most {EPSILON} in
            invoice currency (e.g. 0.02 from rounding). Select rows to mark as Paid, then accept
            or reject.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 min-h-[280px] overflow-auto border rounded-md'>
          {isLoadingPreview ? (
            <div className='flex items-center justify-center gap-2 py-12 text-muted-foreground'>
              <Loader2 className='h-5 w-5 animate-spin' />
              Loading invoices…
            </div>
          ) : previewError ? (
            <p className='py-8 text-center text-sm text-destructive'>{previewError}</p>
          ) : rows.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              No partial invoices with zero balance need updating.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-12'>
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={(value) => toggleAll(value === true)}
                      aria-label='Select all invoices'
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                  <TableHead className='text-right'>Paid</TableHead>
                  <TableHead className='text-right'>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const checked = selectedIds.has(row.id)
                  return (
                    <TableRow
                      key={row.id}
                      data-state={checked ? 'selected' : undefined}
                      className={checked ? 'bg-muted/50' : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleRow(row.id, value === true)}
                          aria-label={`Select invoice ${row.invoice_number}`}
                        />
                      </TableCell>
                      <TableCell className='font-medium'>{row.invoice_number}</TableCell>
                      <TableCell className='text-muted-foreground max-w-[240px] truncate'>
                        {row.customer_name || '—'}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {formatMoney(row.amount)}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {formatMoney(row.paid_amount)}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {formatMoney(row.balance)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {!isLoadingPreview && !previewError && rows.length > 0 && (
          <p className='text-sm text-muted-foreground'>
            {selectedIds.size} of {rows.length} invoice{rows.length === 1 ? '' : 's'} selected
            {selectedIds.size > 0 ? ' to mark as Paid' : ''}.
          </p>
        )}

        <DialogFooter className='gap-4 shrink-0'>
          <Button
            type='button'
            variant='outline'
            onClick={handleReject}
            disabled={isApplying}
          >
            Reject
          </Button>
          <Button
            type='button'
            onClick={() => void handleAccept()}
            disabled={
              isLoadingPreview ||
              isApplying ||
              !!previewError ||
              rows.length === 0 ||
              selectedIds.size === 0
            }
          >
            {isApplying ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Applying…
              </>
            ) : (
              `Accept (${selectedIds.size})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
