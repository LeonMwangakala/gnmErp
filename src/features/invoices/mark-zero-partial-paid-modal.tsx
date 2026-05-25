import { useCallback, useEffect, useState } from 'react'
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

const EPSILON = 0.001

export function MarkZeroPartialPaidModal({ open, onOpenChange, onApplied }: Props) {
  const [rows, setRows] = useState<ZeroPartialInvoiceRow[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const loadPreview = useCallback(async () => {
    setIsLoadingPreview(true)
    setPreviewError(null)
    try {
      const response = await invoiceApi.markZeroPartialPaid(EPSILON, true)
      if (response?.status === 200) {
        const list = (response?.data?.invoices ?? []) as ZeroPartialInvoiceRow[]
        setRows(Array.isArray(list) ? list : [])
      } else {
        setRows([])
        setPreviewError(response?.message || 'Failed to load preview')
      }
    } catch (error: unknown) {
      setRows([])
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
      setPreviewError(null)
      setIsApplying(false)
    }
  }, [open, loadPreview])

  const handleReject = () => {
    onOpenChange(false)
  }

  const handleAccept = async () => {
    if (rows.length === 0) {
      onOpenChange(false)
      return
    }

    try {
      setIsApplying(true)
      const response = await invoiceApi.markZeroPartialPaid(EPSILON, false)
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
      <DialogContent className='max-w-4xl max-h-[85vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Mark zero-balance partials as paid</DialogTitle>
          <DialogDescription>
            These invoices are Partial Paid but their total or balance due is effectively zero
            (≤ {EPSILON}). Review the amounts below, then accept to mark them as Paid or reject to
            cancel.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 min-h-0 overflow-auto border rounded-md'>
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                  <TableHead className='text-right'>Paid</TableHead>
                  <TableHead className='text-right'>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.invoice_number}</TableCell>
                    <TableCell className='text-muted-foreground max-w-[200px] truncate'>
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
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {!isLoadingPreview && !previewError && rows.length > 0 && (
          <p className='text-sm text-muted-foreground'>
            {rows.length} invoice{rows.length === 1 ? '' : 's'} will be marked as Paid.
          </p>
        )}

        <DialogFooter className='gap-2 sm:gap-0'>
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
            disabled={isLoadingPreview || isApplying || !!previewError || rows.length === 0}
          >
            {isApplying ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Applying…
              </>
            ) : (
              'Accept'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
