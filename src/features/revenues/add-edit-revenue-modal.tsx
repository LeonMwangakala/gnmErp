import { useEffect, useState, useRef, useCallback } from 'react'
import AsyncSelect from 'react-select/async'
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
import { revenueApi, customerApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export interface Revenue {
  id: number
  date: string
  date_raw: string
  amount: number
  amount_formatted: string
  account_id: number
  account_name: string
  customer_id: number
  customer_name: string
  category_id: number
  category_name: string
  reference: string
  description: string
  add_receipt: string
  currency: number
  currency_symbol: string
  currency_exchange_rate: number
}

interface CustomerOption {
  id: number
  value: string
  label: string
  name: string
  email: string
}

interface AddEditRevenueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  revenue: Revenue | null
  onSuccess: () => void
}

export function AddEditRevenueModal({
  open,
  onOpenChange,
  revenue,
  onSuccess,
}: AddEditRevenueModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingFormData, setIsLoadingFormData] = useState(false)
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [currencies, setCurrencies] = useState<Array<{
    id: number
    currency_name: string
    currency_symbol: string
    exchange_rate: number
    base: number
  }>>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [form, setForm] = useState({
    date: '',
    amount: '',
    account_id: '',
    customer_id: '',
    category_id: '',
    reference: '',
    description: '',
    currency: '',
    currency_symbol: '',
    currency_exchange_rate: '',
    add_receipt: null as File | null,
  })

  useEffect(() => {
    if (open) {
      loadFormData()
      if (revenue) {
        // Edit mode - populate form with revenue data
        setForm({
          date: revenue.date_raw || '',
          amount: String(revenue.amount || 0),
          account_id: String(revenue.account_id),
          customer_id: String(revenue.customer_id || ''),
          category_id: String(revenue.category_id),
          reference: revenue.reference || '',
          description: revenue.description || '',
          currency: String(revenue.currency),
          currency_symbol: revenue.currency_symbol || '',
          currency_exchange_rate: String(revenue.currency_exchange_rate || 1),
          add_receipt: null,
        })
        // Set selected customer if exists
        if (revenue.customer_id && revenue.customer_name) {
          setSelectedCustomer({
            id: revenue.customer_id,
            value: String(revenue.customer_id),
            label: revenue.customer_name,
            name: revenue.customer_name,
            email: '',
          })
        } else {
          setSelectedCustomer(null)
        }
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
          customer_id: '',
          category_id: '',
          reference: '',
          description: '',
          currency: '',
          currency_symbol: '',
          currency_exchange_rate: '',
          add_receipt: null,
        })
        setSelectedCustomer(null)
      }
    }
  }, [open, revenue])

  const loadFormData = async () => {
    try {
      setIsLoadingFormData(true)
      const data = await revenueApi.getFormData()
      setAccounts(data.accounts || [])
      setCategories(data.categories || [])
      setCurrencies(data.currencies || [])

      // Set default currency (base currency)
      if (!revenue && data.currencies && data.currencies.length > 0) {
        const baseCurrency = data.currencies.find((c: any) => c.base === 1)
        if (baseCurrency) {
          handleCurrencyChange(String(baseCurrency.id), baseCurrency)
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load form data')
      onOpenChange(false)
    } finally {
      setIsLoadingFormData(false)
    }
  }

  const loadCustomerOptions = useCallback(async (inputValue: string): Promise<CustomerOption[]> => {
    if (!inputValue || inputValue.length < 2) {
      return []
    }
    try {
      const customers = await customerApi.searchCustomers(inputValue)
      return customers.map((customer: any) => ({
        id: customer.id,
        value: String(customer.id),
        label: customer.label || customer.name,
        name: customer.name,
        email: customer.email || '',
      }))
    } catch (error: any) {
      console.error('Failed to search customers:', error)
      return []
    }
  }, [])

  const loadCustomerOptionsDebounced = useCallback(
    (inputValue: string, callback: (options: CustomerOption[]) => void) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      debounceTimeoutRef.current = setTimeout(async () => {
        const options = await loadCustomerOptions(inputValue)
        callback(options)
      }, 300)
    },
    [loadCustomerOptions]
  )

  const handleInputChange = (field: keyof typeof form, value: string | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCustomerChange = (selected: CustomerOption | null) => {
    setSelectedCustomer(selected)
    setForm((prev) => ({
      ...prev,
      customer_id: selected ? String(selected.id) : '',
    }))
  }

  const handleCurrencyChange = (currencyId: string, existing?: any) => {
    const currency = existing || currencies.find((cur) => String(cur.id) === currencyId)
    if (!currency) {
      setForm((prev) => ({
        ...prev,
        currency: currencyId,
        currency_symbol: '',
        currency_exchange_rate: '',
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      currency: String(currency.id),
      currency_symbol: currency.currency_symbol,
      currency_exchange_rate: String(currency.exchange_rate ?? 1),
    }))
  }

  const handleFileChange = (file: File | null) => {
    setForm((prev) => ({ ...prev, add_receipt: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!form.date || !form.amount || !form.account_id || !form.category_id || !form.currency) {
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
      formData.append('customer_id', form.customer_id || '0')
      formData.append('category_id', form.category_id)
      formData.append('reference', form.reference)
      formData.append('description', form.description)
      formData.append('currency', form.currency)
      formData.append('currency_symbol', form.currency_symbol)
      formData.append('currency_exchange_rate', form.currency_exchange_rate)
      
      if (form.add_receipt) {
        formData.append('add_receipt', form.add_receipt)
      }

      let response
      if (revenue) {
        response = await revenueApi.updateRevenue(revenue.id, formData)
      } else {
        response = await revenueApi.createRevenue(formData)
      }

      if (response.status === 200) {
        toast.success(
          response.message ||
            (revenue ? 'Revenue updated successfully.' : 'Revenue created successfully.')
        )
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(response.message || 'Failed to save revenue.')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save revenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='!max-w-[900px] sm:!max-w-[900px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {revenue ? 'Edit Revenue' : 'New Revenue'}
          </DialogTitle>
          <DialogDescription>
            {revenue
              ? 'Update revenue information.'
              : 'Record a new revenue entry. All fields marked with * are required.'}
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
                    <SelectTrigger className='w-full'>
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

              {/* Row 2: Customer, Category */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                    Customer
                  </label>
                  <AsyncSelect<CustomerOption>
                    value={selectedCustomer}
                    onChange={handleCustomerChange}
                    loadOptions={loadCustomerOptionsDebounced}
                    placeholder='Type customer name or email...'
                    isClearable
                    isSearchable
                    noOptionsMessage={({ inputValue }) =>
                      inputValue.length < 2
                        ? 'Type at least 2 characters to search'
                        : 'No customers found'
                    }
                    loadingMessage={() => 'Searching customers...'}
                    className='react-select-container'
                    classNamePrefix='react-select'
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        minHeight: '36px',
                        height: '36px',
                        borderColor: state.isFocused
                          ? 'hsl(var(--ring))'
                          : 'hsl(var(--input))',
                        backgroundColor: 'transparent',
                        borderRadius: 'calc(var(--radius) - 2px)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        boxShadow: state.isFocused
                          ? '0 0 0 3px hsl(var(--ring) / 0.5)'
                          : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                        '&:hover': {
                          borderColor: state.isFocused
                            ? 'hsl(var(--ring))'
                            : 'hsl(var(--input))',
                        },
                        transition: 'color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: 'hsl(var(--muted-foreground))',
                      }),
                      input: (base) => ({
                        ...base,
                        color: 'hsl(var(--foreground))',
                        fontSize: '0.875rem',
                        margin: 0,
                        padding: 0,
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: 'hsl(var(--foreground))',
                        fontSize: '0.875rem',
                      }),
                      menu: (base) => ({
                        ...base,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 'calc(var(--radius) - 2px)',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        zIndex: 50,
                      }),
                      menuList: (base) => ({
                        ...base,
                        padding: '0.25rem',
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isFocused
                          ? '#f3f4f6'
                          : '#ffffff',
                        color: '#111827',
                        fontSize: '0.875rem',
                        padding: '0.375rem 0.5rem',
                        borderRadius: 'calc(var(--radius) - 4px)',
                        cursor: 'pointer',
                        '&:active': {
                          backgroundColor: '#e5e7eb',
                          color: '#111827',
                        },
                        '&:hover': {
                          backgroundColor: '#f3f4f6',
                          color: '#111827',
                        },
                      }),
                      indicatorSeparator: () => ({
                        display: 'none',
                      }),
                      dropdownIndicator: (base) => ({
                        ...base,
                        color: 'hsl(var(--muted-foreground))',
                        padding: '0 8px',
                        '&:hover': {
                          color: 'hsl(var(--foreground))',
                        },
                      }),
                    }}
                  />
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
                    <SelectTrigger className='w-full'>
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

              {/* Row 3: Currency, Exchange Rate */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2 w-full'>
                  <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                    Currency <span className='text-destructive'>*</span>
                  </label>
                  <Select
                    value={form.currency}
                    onValueChange={(value) => handleCurrencyChange(value)}
                    required
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select currency' />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((cur) => (
                        <SelectItem key={cur.id} value={String(cur.id)}>
                          {cur.currency_name}
                          {cur.base === 1 ? ' (Base Currency)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                    Exchange Rate
                  </label>
                  <Input
                    value={form.currency_exchange_rate}
                    onChange={(e) => handleInputChange('currency_exchange_rate', e.target.value)}
                    placeholder='Exchange rate'
                    type='number'
                    step='0.01'
                  />
                </div>
              </div>

              {/* Row 4: Amount, Reference */}
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

              {/* Row 5: Description */}
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

              {/* Row 6: Receipt */}
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
                {revenue ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
