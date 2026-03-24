import { useEffect, useState, useRef, useCallback } from 'react'
import AsyncSelect from 'react-select/async'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { paymentApi, bankAccountApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'


interface PaymentAccountOption {
  id: number
  bank_name: string
  holder_name: string
  opening_balance: number
  account_number?: string
  name?: string
}

interface PaymentCurrencyOption {
  id: number
  currency_name: string
  currency_symbol: string
  exchange_rate: number
  base: number
}

interface PaymentFormData {
  invoice_id: string
  account_id: string
  currency: string
  currency_symbol: string
  currency_exchange_rate: string
  amount: string
  date: string
  reference: string
  description: string
  add_receipt: File | null
  invoice_due: string
  invoice_currency: string
  invoice_currency_exchange_rate: string
}

interface AddPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface InvoiceOption {
  value: string
  label: string
  id: number
  invoice_number: string
  subject: string
  customer_name: string
  total: number
  due: number
  currency: number | null
  currency_exchange_rate: number
}

export function AddPaymentModal({ open, onOpenChange, onSuccess }: AddPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceOption | null>(null)
  const [accounts, setAccounts] = useState<PaymentAccountOption[]>([])
  const [currencies, setCurrencies] = useState<PaymentCurrencyOption[]>([])
  const [maxAmount, setMaxAmount] = useState<number | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [form, setForm] = useState<PaymentFormData>({
    invoice_id: '',
    account_id: '',
    currency: '',
    currency_symbol: '',
    currency_exchange_rate: '',
    amount: '',
    date: '',
    reference: '',
    description: '',
    add_receipt: null,
    invoice_due: '',
    invoice_currency: '',
    invoice_currency_exchange_rate: '',
  })

  const normalizeAccount = (acc: any): PaymentAccountOption => ({
    id: Number(acc.id),
    bank_name: acc.bank_name || '',
    holder_name: acc.holder_name || '',
    opening_balance: Number(acc.opening_balance ?? 0),
    account_number: acc.account_number || '',
    name: acc.name || '',
  })

  useEffect(() => {
    if (open) {
      loadFormData()
      // Default date to now in YYYY-MM-DD HH:mm:ss format
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(
        2,
        '0'
      )}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(
        2,
        '0'
      )}`
      setForm((prev) => ({ ...prev, date: dateStr }))
    } else {
      // Reset when closing
      setForm({
        invoice_id: '',
        account_id: '',
        currency: '',
        currency_symbol: '',
        currency_exchange_rate: '',
        amount: '',
        date: '',
        reference: '',
        description: '',
        add_receipt: null,
        invoice_due: '',
        invoice_currency: '',
        invoice_currency_exchange_rate: '',
      })
      setSelectedInvoice(null)
      setMaxAmount(null)
    }
  }, [open])

  const loadFormData = async () => {
    try {
      setIsLoading(true)
      const data = await paymentApi.getPaymentFormData()
      // Don't load invoices - we'll search them dynamically
      let normalizedAccounts: PaymentAccountOption[] = (data.accounts || []).map(normalizeAccount)

      // Fallback: pull from bank-accounts endpoint if payment/form-data has no accounts
      if (normalizedAccounts.length === 0) {
        const bankResp = await bankAccountApi.getBankAccounts({ per_page: 100 })
        normalizedAccounts = (bankResp.data || []).map(normalizeAccount)
      }

      setAccounts(normalizedAccounts)
      setCurrencies(data.currencies || [])

      // Set default currency (base) if exists
      const baseCurrency: PaymentCurrencyOption | undefined = (data.currencies || []).find(
        (c: PaymentCurrencyOption) => c.base === 1
      )
      if (baseCurrency) {
        handleCurrencyChange(String(baseCurrency.id), baseCurrency)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load payment form data')
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Async invoice search function for react-select
  const loadInvoiceOptions = useCallback(async (inputValue: string): Promise<InvoiceOption[]> => {
    if (!inputValue || inputValue.length < 2) {
      return []
    }

    try {
      const results = await paymentApi.searchInvoices(inputValue, 20, 'payment')
      
      // paymentApi.searchInvoices already returns the data array
      if (!Array.isArray(results)) {
        return []
      }
      
      return results.map((inv: any) => ({
        value: String(inv.id),
        label: `${inv.invoice_number} - ${inv.customer_name}${inv.subject ? ` (${inv.subject})` : ''}`,
        id: inv.id,
        invoice_number: inv.invoice_number || '',
        subject: inv.subject || '',
        customer_name: inv.customer_name || '',
        total: inv.total || 0,
        due: inv.due || 0,
        currency: inv.currency,
        currency_exchange_rate: inv.currency_exchange_rate || 1,
      }))
    } catch (error: any) {
      console.error('Error searching invoices:', error)
      return []
    }
  }, [])

  // Debounced invoice search function for react-select (Promise-based)
  const loadInvoiceOptionsDebounced = useCallback(
    (inputValue: string): Promise<InvoiceOption[]> => {
      return new Promise((resolve) => {
        // Clear previous timeout
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
        }

        // Set new timeout
        debounceTimeoutRef.current = setTimeout(async () => {
          const options = await loadInvoiceOptions(inputValue)
          resolve(options)
        }, 300)
      })
    },
    [loadInvoiceOptions]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))

    if (field === 'amount') {
      const numericAmount = parseFloat(value || '0')
      if (maxAmount !== null && numericAmount > maxAmount) {
        toast.error(`Amount cannot exceed ${maxAmount.toFixed(2)} (converted due amount).`)
      }
    }
  }

  const handleInvoiceChange = (selected: InvoiceOption | null) => {
    setSelectedInvoice(selected)
    
    if (selected) {
      setForm((prev) => ({
        ...prev,
        invoice_id: String(selected.id),
        invoice_due: String(selected.due),
        invoice_currency: selected.currency ? String(selected.currency) : '',
        invoice_currency_exchange_rate: String(selected.currency_exchange_rate ?? 1),
      }))

      // Recalculate max amount if we have currency info
      recalculateMaxAmount(
        selected.due,
        selected.currency,
        selected.currency_exchange_rate,
        form.currency ? Number(form.currency) : null,
        form.currency_exchange_rate ? Number(form.currency_exchange_rate) : null
      )
    } else {
      setForm((prev) => ({
        ...prev,
        invoice_id: '',
        invoice_due: '',
        invoice_currency: '',
        invoice_currency_exchange_rate: '',
      }))
      setMaxAmount(null)
    }
  }

  const handleCurrencyChange = (currencyId: string, existing?: PaymentCurrencyOption) => {
    const currency =
      existing || currencies.find((cur: PaymentCurrencyOption) => String(cur.id) === currencyId)
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

    // Recalculate max amount if invoice info is present
    if (form.invoice_due && form.invoice_currency) {
      recalculateMaxAmount(
        Number(form.invoice_due),
        Number(form.invoice_currency),
        Number(form.invoice_currency_exchange_rate || 1),
        currency.id,
        currency.exchange_rate
      )
    }
  }

  const recalculateMaxAmount = (
    invoiceDue: number,
    invoiceCurrencyId: number | null,
    invoiceCurrencyRate: number | null,
    selectedCurrencyId: number | null,
    selectedCurrencyRate: number | null
  ) => {
    if (!invoiceDue || !invoiceCurrencyId || !selectedCurrencyId) {
      setMaxAmount(null)
      return
    }

    const invoiceRate = invoiceCurrencyRate || 1
    const selectedRate = selectedCurrencyRate || 1

    let maximumAmount = invoiceDue
    if (invoiceCurrencyId !== selectedCurrencyId) {
      maximumAmount = invoiceDue * invoiceRate
      maximumAmount = maximumAmount / selectedRate
    }
    setMaxAmount(maximumAmount)
  }

  const handleFileChange = (file: File | null) => {
    setForm((prev) => ({ ...prev, add_receipt: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.invoice_id || !form.account_id || !form.currency || !form.amount || !form.date) {
      toast.error('Please fill in all required fields.')
      return
    }

    const amountValue = parseFloat(form.amount || '0')
    if (maxAmount !== null && amountValue > maxAmount) {
      toast.error(`Amount cannot exceed ${maxAmount.toFixed(2)} (converted due amount).`)
      return
    }

    try {
      setIsSubmitting(true)
      const fd = new FormData()
      fd.append('hidden_id', '')
      fd.append('invoice_id', form.invoice_id)
      fd.append('invoice_due', form.invoice_due)
      fd.append('invoice_currency', form.invoice_currency)
      fd.append('invoice_currency_exchange_rate', form.invoice_currency_exchange_rate)
      fd.append('currency_symbol', form.currency_symbol)
      fd.append('currency', form.currency)
      fd.append('currency_exchange_rate', form.currency_exchange_rate)
      fd.append('amount', form.amount)
      fd.append('date', form.date)
      fd.append('account_id', form.account_id)
      fd.append('payment_method', 'Manual')
      fd.append('receipt', '')
      fd.append('txn_id', '')
      fd.append('reference', form.reference)
      fd.append('description', form.description)

      if (form.add_receipt) {
        fd.append('add_receipt', form.add_receipt)
      }

      const response = await paymentApi.createPayment(fd)
      if (response.status === 200) {
        toast.success(response.message || 'Payment saved successfully.')
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
      <DialogContent className='!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto sm:!max-w-[95vw]'>
        <DialogHeader>
          <DialogTitle>New Invoice Payment</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div className='grid grid-cols-1 md:grid-cols-12 gap-4'>
              <div className='md:col-span-8 space-y-4'>
                {/* Row 1: Invoice *, Account * */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='w-full'>
                    <label className='block text-sm font-medium mb-1'>
                      Invoice <span className='text-destructive'>*</span>
                    </label>
                    <div className='w-full'>
                      <AsyncSelect<InvoiceOption>
                      value={selectedInvoice}
                      onChange={handleInvoiceChange}
                      loadOptions={loadInvoiceOptionsDebounced}
                      placeholder='Type invoice number or customer name...'
                      isClearable
                      isSearchable
                      noOptionsMessage={({ inputValue }) =>
                        inputValue.length < 2
                          ? 'Type at least 2 characters to search'
                          : 'No invoices found'
                      }
                      loadingMessage={() => 'Searching invoices...'}
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
                          boxShadow: state.isFocused
                            ? '0 0 0 3px hsl(var(--ring) / 0.5)'
                            : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                          '&:hover': {
                            borderColor: state.isFocused
                              ? 'hsl(var(--ring))'
                              : 'hsl(var(--input))',
                          },
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: 'hsl(var(--muted-foreground))',
                          fontSize: '0.875rem',
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
                          backgroundColor: state.isFocused || state.isSelected
                            ? '#f3f4f6'
                            : '#ffffff',
                          color: state.isFocused || state.isSelected
                            ? '#111827'
                            : '#111827',
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
                        clearIndicator: (base) => ({
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
                  </div>

                  <div className='w-full'>
                    <label className='block text-sm font-medium mb-1'>
                      Account <span className='text-destructive'>*</span>
                    </label>
                    <Select
                      value={form.account_id}
                      onValueChange={(value) => handleInputChange('account_id', value)}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select account' />
                      </SelectTrigger>
                      <SelectContent className='w-[var(--radix-select-trigger-width)]'>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={String(acc.id)}>
                            {(acc.bank_name || acc.holder_name
                              ? `${acc.bank_name} ${acc.holder_name}`.trim()
                              : acc.name || `Account #${acc.id}`)}{' '}
                            {Number.isFinite(acc.opening_balance)
                              ? `[${acc.opening_balance.toLocaleString()}]`
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Currency *, Exchange Rate */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Currency <span className='text-destructive'>*</span>
                    </label>
                    <Select
                      value={form.currency}
                      onValueChange={(value) => handleCurrencyChange(value)}
                    >
                      <SelectTrigger>
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

                  <div>
                    <label className='block text-sm font-medium mb-1'>Exchange Rate</label>
                    <Input
                      value={form.currency_exchange_rate}
                      onChange={(e) => handleInputChange('currency_exchange_rate', e.target.value)}
                      placeholder='Exchange rate'
                    />
                  </div>
                </div>

                {/* Row 3: Received Amount, Received Date */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Received Amount <span className='text-destructive'>*</span>
                    </label>
                    <Input
                      value={form.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      placeholder='Amount'
                    />
                    {maxAmount !== null && (
                      <p className='mt-1 text-xs text-muted-foreground'>
                        Maximum allowed (based on due & currency): {maxAmount.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Received Date <span className='text-destructive'>*</span>
                    </label>
                    <Input
                      value={form.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      placeholder='YYYY-MM-DD HH:mm:ss'
                    />
                  </div>
                </div>

                {/* Row 4: Reference, Receipt */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium mb-1'>Reference</label>
                    <Input
                      value={form.reference}
                      onChange={(e) => handleInputChange('reference', e.target.value)}
                      placeholder='Reference'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium mb-1'>Receipt</label>
                    <Input
                      type='file'
                      accept='image/*,application/pdf'
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                {/* Row 5: Description */}
                <div>
                  <label className='block text-sm font-medium mb-1'>Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder='Description'
                    rows={3}
                  />
                </div>
              </div>

              <div className='md:col-span-4 space-y-3 border rounded-md p-3 bg-muted/30'>
                <h3 className='text-sm font-semibold mb-2'>Invoice Details</h3>
                <div className='text-sm space-y-1'>
                  <p>
                    <span className='text-muted-foreground'>Invoice Amount: </span>
                    <span>
                      {selectedInvoice
                        ? selectedInvoice.total.toLocaleString()
                        : '-'}
                    </span>
                  </p>
                  <p>
                    <span className='text-muted-foreground'>Total Due: </span>
                    <span>
                      {selectedInvoice
                        ? selectedInvoice.due.toLocaleString()
                        : '-'}
                    </span>
                  </p>
                  <p>
                    <span className='text-muted-foreground'>Currency: </span>
                    <span>
                      {(() => {
                        const cur = currencies.find(
                          (c) => String(c.id) === form.currency
                        )
                        if (!cur) return '-'
                        return `${cur.currency_name} (${cur.currency_symbol})`
                      })()}
                    </span>
                  </p>
                </div>
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
                Save
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

