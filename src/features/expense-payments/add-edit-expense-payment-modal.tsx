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
import { expensePaymentApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ExpensePayment } from './index'

interface AddEditExpensePaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: ExpensePayment | null
  onSuccess: () => void
}

export function AddEditExpensePaymentModal({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: AddEditExpensePaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingFormData, setIsLoadingFormData] = useState(false)
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [vendors, setVendors] = useState<Array<{ id: number; name: string }>>([])

  const [form, setForm] = useState({
    date: '',
    amount: '',
    account_id: '',
    vender_id: 'none',
    category_id: '',
    reference: '',
    description: '',
    add_receipt: null as File | null,
  })

  useEffect(() => {
    if (open) {
      loadFormData()
      if (payment) {
        // Edit mode - populate form with payment data
        setForm({
          date: payment.date_raw || '',
          amount: String(payment.amount || 0),
          account_id: String(payment.account_id),
          vender_id: payment.vender_id ? String(payment.vender_id) : 'none',
          category_id: String(payment.category_id),
          reference: payment.reference || '',
          description: payment.description || '',
          add_receipt: null,
        })
      } else {
        // Add mode - reset form
        const now = new Date()
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(now.getDate()).padStart(2, '0')}`
        setForm({
          date: dateStr,
          amount: '',
          account_id: '',
          vender_id: 'none',
          category_id: '',
          reference: '',
          description: '',
          add_receipt: null,
        })
      }
    }
  }, [open, payment])

  const loadFormData = async () => {
    try {
      setIsLoadingFormData(true)
      const data = await expensePaymentApi.getFormData()
      setAccounts(data.accounts || [])
      setCategories(data.categories || [])
      setVendors(data.vendors || [])
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load form data')
      onOpenChange(false)
    } finally {
      setIsLoadingFormData(false)
    }
  }

  const handleInputChange = (field: keyof typeof form, value: string | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (file: File | null) => {
    setForm((prev) => ({ ...prev, add_receipt: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!form.date || !form.amount || !form.account_id || !form.category_id) {
      toast.error('Please fill in all required fields.')
      return
    }

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be a valid positive number.')
      return
    }

    try {
      setIsSubmitting(true)

      const formData = new FormData()
      formData.append('date', form.date)
      formData.append('amount', form.amount)
      formData.append('account_id', form.account_id)
      if (form.vender_id && form.vender_id !== 'none') {
        formData.append('vender_id', form.vender_id)
      }
      formData.append('category_id', form.category_id)
      formData.append('reference', form.reference)
      formData.append('description', form.description)
      
      if (form.add_receipt) {
        formData.append('add_receipt', form.add_receipt)
      }

      let response
      if (payment) {
        response = await expensePaymentApi.updateExpensePayment(payment.id, formData)
      } else {
        response = await expensePaymentApi.createExpensePayment(formData)
      }

      if (response.status === 200) {
        toast.success(
          response.message ||
            (payment ? 'Payment updated successfully.' : 'Payment created successfully.')
        )
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(response.message || 'Failed to save payment.')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save payment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='!max-w-[900px] sm:!max-w-[900px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {payment ? 'Edit Payment' : 'New Payment'}
          </DialogTitle>
          <DialogDescription>
            {payment
              ? 'Update payment information.'
              : 'Record a new expense payment. All fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>

        {isLoadingFormData ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <form className='space-y-6' onSubmit={handleSubmit}>
            <div className='space-y-4'>
              {/* Row 1: Date, Account */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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

                <div className='space-y-2 w-full'>
                  <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                    Account <span className='text-destructive'>*</span>
                  </label>
                  <Select
                    value={form.account_id}
                    onValueChange={(value) => handleInputChange('account_id', value)}
                    required
                  >
                    <SelectTrigger className='!w-full'>
                      <SelectValue placeholder='Select account' />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Vendor, Category */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2 w-full'>
                  <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                    Vendor
                  </label>
                  <Select
                    value={form.vender_id}
                    onValueChange={(value) => handleInputChange('vender_id', value)}
                  >
                    <SelectTrigger className='!w-full'>
                      <SelectValue placeholder='Select vendor (optional)' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>None</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={String(vendor.id)}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2 w-full'>
                  <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                    Category <span className='text-destructive'>*</span>
                  </label>
                  <Select
                    value={form.category_id}
                    onValueChange={(value) => handleInputChange('category_id', value)}
                    required
                  >
                    <SelectTrigger className='!w-full'>
                      <SelectValue placeholder='Select category' />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Amount, Reference */}
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
                    Reference
                  </label>
                  <Input
                    value={form.reference}
                    onChange={(e) => handleInputChange('reference', e.target.value)}
                    placeholder='Enter reference'
                  />
                </div>
              </div>

              {/* Row 4: Description */}
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

              {/* Row 5: Receipt */}
              <div className='space-y-2'>
                <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                  Payment Receipt
                </label>
                <Input
                  type='file'
                  accept='image/*,application/pdf'
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
                {form.add_receipt && (
                  <p className='text-xs text-muted-foreground mt-1'>
                    Selected: {form.add_receipt.name}
                  </p>
                )}
                {payment && payment.add_receipt && !form.add_receipt && (
                  <p className='text-xs text-muted-foreground mt-1'>
                    Current receipt: {payment.add_receipt}
                  </p>
                )}
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
                {payment ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
