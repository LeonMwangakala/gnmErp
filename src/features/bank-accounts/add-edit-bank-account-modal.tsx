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
import { Button } from '@/components/ui/button'
import { bankAccountApi } from '@/lib/api'

export interface BankAccount {
  id: number
  holder_name: string
  bank_name: string
  account_number: string
  opening_balance: number
  opening_balance_formatted: string
  contact_number: string
  bank_address: string
  currency_id?: number | null
  currency_code?: string | null
  currency_name?: string | null
  currency_symbol?: string | null
}
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface AddEditBankAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: BankAccount | null
  onSuccess: () => void
}

export function AddEditBankAccountModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: AddEditBankAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    holder_name: '',
    bank_name: '',
    account_number: '',
    opening_balance: '',
    contact_number: '',
    bank_address: '',
    currency: '',
  })
  const [currencies, setCurrencies] = useState<
    { id: number; currency_name: string; currency_code: string; currency_symbol: string; base: number }[]
  >([])
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false)

  useEffect(() => {
    if (open) {
      // Load currencies when modal opens
      loadFormData()

      if (account) {
        // Edit mode - populate form with account data
        setForm({
          holder_name: account.holder_name || '',
          bank_name: account.bank_name || '',
          account_number: account.account_number || '',
          opening_balance: String(account.opening_balance || 0),
          contact_number: account.contact_number || '',
          bank_address: account.bank_address || '',
          currency: account.currency_id ? String(account.currency_id) : '',
        })
      } else {
        // Add mode - reset form
        setForm({
          holder_name: '',
          bank_name: '',
          account_number: '',
          opening_balance: '',
          contact_number: '',
          bank_address: '',
          currency: '',
        })
      }
    }
  }, [open, account])

  const loadFormData = async () => {
    try {
      setIsLoadingCurrencies(true)
      const data = await bankAccountApi.getFormData()
      setCurrencies(data.currencies || [])
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load bank account form data')
    } finally {
      setIsLoadingCurrencies(false)
    }
  }

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (
      !form.holder_name ||
      !form.bank_name ||
      !form.account_number ||
      !form.opening_balance ||
      !form.contact_number ||
      !form.currency
    ) {
      toast.error('Please fill in all required fields.')
      return
    }

    const openingBalance = parseFloat(form.opening_balance)
    if (isNaN(openingBalance)) {
      toast.error('Opening balance must be a valid number.')
      return
    }

    // Validate contact number format (basic regex check)
    const contactRegex = /^([0-9\s\-\+\(\)]*)$/
    if (!contactRegex.test(form.contact_number)) {
      toast.error('Contact number format is invalid.')
      return
    }

    try {
      setIsSubmitting(true)

      const data = {
        holder_name: form.holder_name,
        bank_name: form.bank_name,
        account_number: form.account_number,
        opening_balance: openingBalance,
        contact_number: form.contact_number,
        bank_address: form.bank_address || '',
      currency: Number(form.currency),
      }

      let response
      if (account) {
        // Update existing account
        response = await bankAccountApi.updateBankAccount(account.id, data)
      } else {
        // Create new account
        response = await bankAccountApi.createBankAccount(data)
      }

      if (response.status === 200) {
        toast.success(response.message || (account ? 'Bank account updated successfully.' : 'Bank account created successfully.'))
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(response.message || 'Failed to save bank account.')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save bank account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {account ? 'Edit Bank Account' : 'New Bank Account'}
          </DialogTitle>
          <DialogDescription>
            {account
              ? 'Update bank account information.'
              : 'Create a new bank account. All fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={handleSubmit}>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium mb-1'>
                Bank Holder Name <span className='text-destructive'>*</span>
              </label>
              <Input
                value={form.holder_name}
                onChange={(e) => handleInputChange('holder_name', e.target.value)}
                placeholder='Enter holder name'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium mb-1'>
                Bank Name <span className='text-destructive'>*</span>
              </label>
              <Input
                value={form.bank_name}
                onChange={(e) => handleInputChange('bank_name', e.target.value)}
                placeholder='Enter bank name'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium mb-1'>
                Account Number <span className='text-destructive'>*</span>
              </label>
              <Input
                value={form.account_number}
                onChange={(e) => handleInputChange('account_number', e.target.value)}
                placeholder='Enter account number'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium mb-1'>
                Opening Balance <span className='text-destructive'>*</span>
              </label>
              <Input
                type='number'
                step='0.01'
                value={form.opening_balance}
                onChange={(e) => handleInputChange('opening_balance', e.target.value)}
                placeholder='0.00'
                required
              />
            </div>

            <div className='md:col-span-2'>
              <label className='block text-sm font-medium mb-1'>
                Currency <span className='text-destructive'>*</span>
              </label>
              {isLoadingCurrencies ? (
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Loading currencies...
                </div>
              ) : (
                <select
                  className='block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  value={form.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  required
                >
                  <option value=''>Select currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.currency_name} ({currency.currency_code}){' '}
                      {currency.base === 1 ? '- Base' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className='md:col-span-2'>
              <label className='block text-sm font-medium mb-1'>
                Contact Number <span className='text-destructive'>*</span>
              </label>
              <Input
                value={form.contact_number}
                onChange={(e) => handleInputChange('contact_number', e.target.value)}
                placeholder='Enter contact number'
                required
              />
            </div>

            <div className='md:col-span-2'>
              <label className='block text-sm font-medium mb-1'>Bank Address</label>
              <Textarea
                value={form.bank_address}
                onChange={(e) => handleInputChange('bank_address', e.target.value)}
                placeholder='Enter bank address'
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
              {account ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
