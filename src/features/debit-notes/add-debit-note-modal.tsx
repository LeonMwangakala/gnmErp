import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { debitNoteApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface BillOption {
  id: number
  bill_id: number
  bill_number: string
  vendor_id: number | null
  vendor_name: string
  due: number
  due_formatted: string
}

interface AddDebitNoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddDebitNoteModal({
  open,
  onOpenChange,
  onSuccess,
}: AddDebitNoteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingFormData, setIsLoadingFormData] = useState(false)
  const [bills, setBills] = useState<BillOption[]>([])

  const [form, setForm] = useState({
    bill_id: '',
    amount: '',
    date: '',
    description: '',
  })

  useEffect(() => {
    if (open) {
      loadFormData()
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')}`
      setForm((prev) => ({
        ...prev,
        date: dateStr,
      }))
    } else {
      setForm({
        bill_id: '',
        amount: '',
        date: '',
        description: '',
      })
      setBills([])
    }
  }, [open])

  const loadFormData = async () => {
    try {
      setIsLoadingFormData(true)
      const data = await debitNoteApi.getFormData()
      setBills(data.bills || [])
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load debit note form data')
      onOpenChange(false)
    } finally {
      setIsLoadingFormData(false)
    }
  }

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.bill_id || !form.amount || !form.date) {
      toast.error('Please fill in all required fields.')
      return
    }

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be a valid positive number.')
      return
    }

    const selectedBill = bills.find((b) => String(b.id) === form.bill_id)
    if (selectedBill && amount > selectedBill.due) {
      toast.error(
        `Amount cannot exceed the bill due amount (${selectedBill.due_formatted}).`
      )
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        bill_id: form.bill_id,
        amount: form.amount,
        date: form.date,
        description: form.description,
      }

      const response = await debitNoteApi.createDebitNote(payload)
      if (response.status === 200) {
        toast.success(response.message || 'Debit note successfully created.')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(response.message || 'Failed to create debit note.')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create debit note.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='!max-w-[600px] sm:!max-w-[600px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>New Debit Note</DialogTitle>
          <DialogDescription>
            Record a new debit note for a bill. Amount cannot exceed the bill due amount.
          </DialogDescription>
        </DialogHeader>

        {isLoadingFormData ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <form className='space-y-6' onSubmit={handleSubmit}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                  Bill <span className='text-destructive'>*</span>
                </label>
                <Select
                  value={form.bill_id}
                  onValueChange={(value) => handleInputChange('bill_id', value)}
                  required
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select bill' />
                  </SelectTrigger>
                  <SelectContent>
                    {bills.map((bill) => (
                      <SelectItem key={bill.id} value={String(bill.id)}>
                        {bill.bill_number} - {bill.vendor_name} (Due: {bill.due_formatted})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                    Amount <span className='text-destructive'>*</span>
                  </label>
                  <Input
                    type='number'
                    step='0.01'
                    min='0.01'
                    value={form.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder='0.00'
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                    Date <span className='text-destructive'>*</span>
                  </label>
                  <Input
                    type='date'
                    value={form.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                  Description
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder='Enter description'
                  rows={3}
                />
              </div>
            </div>

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Create
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

