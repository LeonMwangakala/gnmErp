import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { invoiceApi } from '@/lib/api'
import { toast } from 'sonner'

interface UpdateInvoiceAmountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: {
    id: number
    invoice_number: string
    amount: number
  } | null
  onUpdated: () => void
}

export function UpdateInvoiceAmountModal({
  open,
  onOpenChange,
  invoice,
  onUpdated,
}: UpdateInvoiceAmountModalProps) {
  const [amount, setAmount] = useState('')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && invoice) {
      setAmount(invoice.amount > 0 ? invoice.amount.toFixed(2) : '')
      setDetails('')
    }
  }, [open, invoice])

  const handleSubmit = async () => {
    if (!invoice) return
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Enter a valid invoice amount greater than 0.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await invoiceApi.updateInvoiceAmount(invoice.id, parsed, details)
      if (response?.status === 200) {
        toast.success(response?.message || 'Invoice amount updated successfully.')
        onOpenChange(false)
        onUpdated()
      } else {
        toast.error(response?.message || 'Failed to update invoice amount.')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update invoice amount.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[520px]'>
        <DialogHeader>
          <DialogTitle>Update Invoice Amount</DialogTitle>
          <DialogDescription>
            Invoice <span className='font-medium'>{invoice?.invoice_number || '-'}</span>. This will also
            recalculate related invoice payment amount(s).
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='invoice-amount'>New invoice amount</Label>
            <Input
              id='invoice-amount'
              type='number'
              min='0'
              step='0.01'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='invoice-amount-details'>Reason (optional)</Label>
            <Input
              id='invoice-amount-details'
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder='Reason for update'
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
