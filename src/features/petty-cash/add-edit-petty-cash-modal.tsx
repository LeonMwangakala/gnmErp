import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from '@/components/ui/label'
import { pettyCashApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { PettyCashExpense } from './index'

interface CurrencyOption {
  id: number
  currency_name: string
  currency_symbol: string
  base: number
}

interface CategoryOption {
  id: number
  name: string
}

interface ReceiverOption {
  id: number
  name: string
}

interface PettyCashItem {
  id?: number
  category_id: string
  title: string
  description: string
  amount: string
}

interface PettyCashFormData {
  date: string
  currency: string
  folio: string
  receiver_for: string
  receiver: string
  receiver_name: string
  receiver_phone: string
  items: PettyCashItem[]
}

interface AddEditPettyCashModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: PettyCashExpense | null
  onSuccess: () => void
}

export function AddEditPettyCashModal({
  open,
  onOpenChange,
  expense,
  onSuccess,
}: AddEditPettyCashModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [receivers, setReceivers] = useState<ReceiverOption[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [grandTotal, setGrandTotal] = useState<number>(0)

  const [form, setForm] = useState<PettyCashFormData>({
    date: '',
    currency: '',
    folio: '',
    receiver_for: 'Employee',
    receiver: '',
    receiver_name: '',
    receiver_phone: '',
    items: [
      {
        category_id: 'none',
        title: '',
        description: '',
        amount: '',
      },
    ],
  })

  useEffect(() => {
    if (open) {
      if (expense) {
        loadExpenseData()
      } else {
        loadFormData()
        const now = new Date()
        const dateStr = now.toISOString().slice(0, 16)
        setForm((prev) => ({
          ...prev,
          date: dateStr,
        }))
      }
    }
  }, [open, expense])

  const loadFormData = async () => {
    setIsLoading(true)
    try {
      const data = await pettyCashApi.getFormData()
      setCurrencies(data.currencies || [])
      setCategories(data.categories || [])
      setBalance(data.balance || 0)
      
      // Set default currency (base currency)
      const baseCurrency = data.currencies?.find((c: CurrencyOption) => c.base === 1)
      if (baseCurrency) {
        setForm((prev) => ({ ...prev, currency: baseCurrency.id.toString() }))
      }

      // Load receivers for default receiver_for
      if (form.receiver_for) {
        await loadReceivers(form.receiver_for)
      }
    } catch (error: any) {
      toast.error('Failed to load form data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadExpenseData = async () => {
    if (!expense) return

    setIsLoading(true)
    try {
      const data = await pettyCashApi.getPettyCash(expense.id)
      const formData = await pettyCashApi.getFormData()
      setCurrencies(formData.currencies || [])
      setCategories(formData.categories || [])
      setBalance(formData.balance || 0)

      setForm({
        date: data.date ? new Date(data.date).toISOString().slice(0, 16) : '',
        currency: data.currency?.toString() || '',
        folio: data.folio || '',
        receiver_for: data.receiver_for || 'Employee',
        receiver: data.receiver?.toString() || '',
        receiver_name: data.receiver_name || '',
        receiver_phone: data.receiver_phone || '',
        items: data.items?.map((item: any) => ({
          id: item.id,
          category_id: item.category_id?.toString() || 'none',
          title: item.title || '',
          description: item.description || '',
          amount: item.amount?.toString() || '',
        })) || [],
      })

      // Calculate grand total
      const total = data.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0) || 0
      setGrandTotal(total)

      // Load receivers
      if (data.receiver_for) {
        await loadReceivers(data.receiver_for)
      }
    } catch (error: any) {
      toast.error('Failed to load expense data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadReceivers = async (receiverFor: string) => {
    try {
      const data = await pettyCashApi.getReceiverNames(receiverFor)
      setReceivers(data || [])
    } catch (error: any) {
      console.error('Failed to load receivers:', error)
      setReceivers([])
    }
  }

  const handleReceiverForChange = async (value: string) => {
    setForm((prev) => ({
      ...prev,
      receiver_for: value,
      receiver: '',
      receiver_name: '',
      receiver_phone: '',
    }))
    await loadReceivers(value)
  }

  const handleReceiverChange = async (value: string) => {
    if (!value || !form.receiver_for) return

    try {
      const receiverData = await pettyCashApi.getReceiverDetails(parseInt(value), form.receiver_for)
      setForm((prev) => ({
        ...prev,
        receiver: value,
        receiver_name: receiverData?.name || '',
        receiver_phone: receiverData?.contact || receiverData?.phone || '',
      }))
    } catch (error: any) {
      console.error('Failed to load receiver details:', error)
    }
  }

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          category_id: 'none',
          title: '',
          description: '',
          amount: '',
        },
      ],
    }))
  }

  const removeItem = (index: number) => {
    setForm((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index)
      if (newItems.length === 0) {
        return {
          ...prev,
          items: [
            {
              category_id: 'none',
              title: '',
              description: '',
              amount: '',
            },
          ],
        }
      }
      return { ...prev, items: newItems }
    })
    calculateTotal()
  }

  const updateItem = (index: number, field: keyof PettyCashItem, value: string) => {
    setForm((prev) => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...prev, items: newItems }
    })
    if (field === 'amount') {
      calculateTotal()
    }
  }

  const calculateTotal = () => {
    const total = form.items.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0)
    }, 0)
    setGrandTotal(total)
  }

  useEffect(() => {
    calculateTotal()
  }, [form.items])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.date || !form.currency || !form.receiver_for || !form.receiver) {
      toast.error('Please fill in all required fields')
      return
    }

    if (form.items.length === 0 || form.items.some(item => !item.title || !item.amount)) {
      toast.error('Please add at least one item with title and amount')
      return
    }

    if (grandTotal > balance) {
      toast.error('Petty cash balance not enough')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        date: form.date,
        currency: parseInt(form.currency),
        folio: form.folio,
        receiver_for: form.receiver_for,
        receiver: parseInt(form.receiver),
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        grand_total: grandTotal,
        items: form.items.map((item) => ({
          id: item.id,
          category_id: item.category_id && item.category_id !== 'none' ? parseInt(item.category_id) : 0,
          title: item.title,
          description: item.description,
          amount: parseFloat(item.amount),
        })),
      }

      if (expense) {
        await pettyCashApi.updatePettyCash(expense.id, payload)
        toast.success('Petty cash expense updated successfully')
      } else {
        await pettyCashApi.createPettyCash(payload)
        toast.success('Petty cash expense created successfully')
      }

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save petty cash expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {expense ? 'Edit Petty Cash Expense' : 'New Petty Cash Expense'}
          </DialogTitle>
          <DialogDescription>
            {expense
              ? 'Update the petty cash expense details'
              : 'Create a new petty cash expense'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Balance Display */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Available Balance:</span>
                <span className="text-lg font-semibold text-green-600">
                  {balance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="font-medium">Grand Total:</span>
                <span className="text-lg font-semibold">
                  {grandTotal.toLocaleString()}
                </span>
              </div>
              {grandTotal > balance && (
                <div className="mt-2 text-sm text-red-600">
                  Insufficient balance!
                </div>
              )}
            </div>

            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">
                  Currency <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) => setForm({ ...form, currency: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id.toString()}>
                        {currency.currency_name} {currency.base === 1 ? '(Base)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="folio">Reference</Label>
                <Input
                  id="folio"
                  value={form.folio}
                  onChange={(e) => setForm({ ...form, folio: e.target.value })}
                  placeholder="Enter reference"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver_for">
                  Receiver <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.receiver_for}
                  onValueChange={handleReceiverForChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.receiver_for !== 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="receiver">
                    Receiver Selected <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.receiver}
                    onValueChange={handleReceiverChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select receiver" />
                    </SelectTrigger>
                    <SelectContent>
                      {receivers.map((receiver) => (
                        <SelectItem key={receiver.id} value={receiver.id.toString()}>
                          {receiver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="receiver_name">Receiver Name</Label>
                <Input
                  id="receiver_name"
                  value={form.receiver_name}
                  onChange={(e) => setForm({ ...form, receiver_name: e.target.value })}
                  placeholder="Enter receiver name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver_phone">Receiver Phone</Label>
                <Input
                  id="receiver_phone"
                  value={form.receiver_phone}
                  onChange={(e) => setForm({ ...form, receiver_phone: e.target.value })}
                  placeholder="Enter receiver phone"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left text-sm font-medium">Title *</th>
                      <th className="p-2 text-left text-sm font-medium">Category</th>
                      <th className="p-2 text-left text-sm font-medium">Description</th>
                      <th className="p-2 text-left text-sm font-medium">Amount *</th>
                      <th className="p-2 text-left text-sm font-medium w-[80px]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">
                          <Input
                            value={item.title}
                            onChange={(e) => updateItem(index, 'title', e.target.value)}
                            placeholder="Enter title"
                            required
                            className="w-full"
                          />
                        </td>
                        <td className="p-2">
                          <Select
                            value={item.category_id}
                            onValueChange={(value) => updateItem(index, 'category_id', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Textarea
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Enter description"
                            rows={1}
                            className="w-full"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.amount}
                            onChange={(e) => updateItem(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            required
                            className="w-full"
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted">
                    <tr>
                      <td colSpan={3} className="p-2 text-right font-medium">
                        Total Amount:
                      </td>
                      <td className="p-2 font-semibold">{grandTotal.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {expense ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
