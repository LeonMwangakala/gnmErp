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
import { bankTransferApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export interface BankTransfer {
  id: number
  date: string
  date_raw: string
  from_account_id: number
  from_account_name: string
  to_account_id: number
  to_account_name: string
  amount: number
  amount_formatted: string
  reference: string
  description: string
}

interface AddEditBankTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transfer: BankTransfer | null
  onSuccess: () => void
}

export function AddEditBankTransferModal({
  open,
  onOpenChange,
  transfer,
  onSuccess,
}: AddEditBankTransferModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: number; name: string }>>([])
  const [form, setForm] = useState({
    from_account: '',
    to_account: '',
    amount: '',
    date: '',
    reference: '',
    description: '',
  })

  useEffect(() => {
    if (open) {
      loadBankAccounts()
      if (transfer) {
        // Edit mode - populate form with transfer data
        setForm({
          from_account: String(transfer.from_account_id),
          to_account: String(transfer.to_account_id),
          amount: String(transfer.amount || 0),
          date: transfer.date_raw || '',
          reference: transfer.reference || '',
          description: transfer.description || '',
        })
      } else {
        // Add mode - reset form
        const now = new Date()
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(now.getDate()).padStart(2, '0')}`
        setForm({
          from_account: '',
          to_account: '',
          amount: '',
          date: dateStr,
          reference: '',
          description: '',
        })
      }
    }
  }, [open, transfer])

  const loadBankAccounts = async () => {
    try {
      setIsLoadingAccounts(true)
      const accounts = await bankTransferApi.getBankAccounts()
      setBankAccounts(accounts)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load bank accounts')
    } finally {
      setIsLoadingAccounts(false)
    }
  }

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!form.from_account || !form.to_account || !form.amount || !form.date) {
      toast.error('Please fill in all required fields.')
      return
    }

    if (form.from_account === form.to_account) {
      toast.error('From account and To account cannot be the same.')
      return
    }

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be a valid positive number.')
      return
    }

    try {
      setIsSubmitting(true)

      const data = {
        from_account: Number(form.from_account),
        to_account: Number(form.to_account),
        amount: amount,
        date: form.date,
        reference: form.reference || '',
        description: form.description || '',
      }

      let response
      if (transfer) {
        // Update existing transfer
        response = await bankTransferApi.updateBankTransfer(transfer.id, data)
      } else {
        // Create new transfer
        response = await bankTransferApi.createBankTransfer(data)
      }

      if (response.status === 200) {
        toast.success(
          response.message ||
            (transfer
              ? 'Bank transfer updated successfully.'
              : 'Bank transfer created successfully.')
        )
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(response.message || 'Failed to save bank transfer.')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save bank transfer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {transfer ? 'Edit Bank Transfer' : 'New Bank Transfer'}
          </DialogTitle>
          <DialogDescription>
            {transfer
              ? 'Update bank transfer information.'
              : 'Transfer amount from one bank account to another. All fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>

        {isLoadingAccounts ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium mb-1'>
                  From Account <span className='text-destructive'>*</span>
                </label>
                <Select
                  value={form.from_account}
                  onValueChange={(value) => handleInputChange('from_account', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select from account' />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className='block text-sm font-medium mb-1'>
                  To Account <span className='text-destructive'>*</span>
                </label>
                <Select
                  value={form.to_account}
                  onValueChange={(value) => handleInputChange('to_account', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select to account' />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className='block text-sm font-medium mb-1'>
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

              <div>
                <label className='block text-sm font-medium mb-1'>
                  Date <span className='text-destructive'>*</span>
                </label>
                <Input
                  type='date'
                  value={form.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

              <div className='md:col-span-2'>
                <label className='block text-sm font-medium mb-1'>Reference</label>
                <Input
                  value={form.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  placeholder='Enter reference'
                />
              </div>

              <div className='md:col-span-2'>
                <label className='block text-sm font-medium mb-1'>Description</label>
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
                {transfer ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
