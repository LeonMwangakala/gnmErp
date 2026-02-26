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
import { billApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'

interface VendorOption {
  id: number
  name: string
}

interface CategoryOption {
  id: number
  name: string
}

interface ProductOption {
  id: number
  name: string
  sku: string
  purchase_price: number
}

interface BillItemForm {
  item: string
  quantity: string
  price: string
  tax: string
  discount: string
  description: string
}

interface BillFormData {
  vender_id: string
  bill_date: string
  due_date: string
  category_id: string
  order_number: string
  items: BillItemForm[]
}

interface AddBillModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddBillModal({ open, onOpenChange, onSuccess }: AddBillModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [billNumber, setBillNumber] = useState<string>('')

  const [form, setForm] = useState<BillFormData>({
    vender_id: '',
    bill_date: '',
    due_date: '',
    category_id: '',
    order_number: '',
    items: [
      {
        item: '',
        quantity: '1',
        price: '',
        tax: '',
        discount: '0',
        description: '',
      },
    ],
  })

  useEffect(() => {
    if (open) {
      loadFormData()
      // default dates to today
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10)
      setForm((prev) => ({
        ...prev,
        bill_date: dateStr,
        due_date: dateStr,
      }))
    } else {
      setForm({
        vender_id: '',
        bill_date: '',
        due_date: '',
        category_id: '',
        order_number: '',
        items: [
          {
            item: '',
            quantity: '1',
            price: '',
            tax: '',
            discount: '0',
            description: '',
          },
        ],
      })
      setVendors([])
      setCategories([])
      setProducts([])
      setBillNumber('')
    }
  }, [open])

  const loadFormData = async () => {
    try {
      setIsLoading(true)
      const data = await billApi.getFormData()
      setVendors(data.vendors || [])
      setCategories(data.categories || [])
      setProducts(data.products || [])
      setBillNumber(data.bill_number || '')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load bill form data')
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof BillFormData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleItemChange = (index: number, field: keyof BillItemForm, value: string) => {
    setForm((prev) => {
      const items = [...prev.items]
      items[index] = { ...items[index], [field]: value }
      return { ...prev, items }
    })
  }

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item: '',
          quantity: '1',
          price: '',
          tax: '',
          discount: '0',
          description: '',
        },
      ],
    }))
  }

  const removeItemRow = (index: number) => {
    setForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index)
      return { ...prev, items: items.length ? items : prev.items }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.vender_id || !form.bill_date || !form.due_date || !form.category_id) {
      toast.error('Please fill in all required fields.')
      return
    }

    if (!form.items.length || form.items.some((it) => !it.item || !it.quantity || !it.price)) {
      toast.error('Please add at least one item with product, quantity, and price.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        vender_id: form.vender_id,
        bill_date: form.bill_date,
        due_date: form.due_date,
        category_id: form.category_id,
        order_number: form.order_number || undefined,
        items: form.items.map((it) => ({
          item: Number(it.item),
          quantity: Number(it.quantity || '0'),
          price: Number(it.price || '0'),
          tax: it.tax,
          discount: Number(it.discount || '0'),
          description: it.description || '',
        })),
      }

      const response = await billApi.createBill(payload)
      if (response.status === 200) {
        toast.success(response.message || 'Bill successfully created.')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(response.message || 'Failed to create bill.')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create bill.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto sm:!max-w-[900px]">
        <DialogHeader>
          <DialogTitle>New Bill</DialogTitle>
          <DialogDescription>
            Create a new bill. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Vendor <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.vender_id}
                  onValueChange={(value) => handleChange('vender_id', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Category <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) => handleChange('category_id', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Bill Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={form.bill_date}
                  onChange={(e) => handleChange('bill_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Due Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Bill No.
                </label>
                <Input value={billNumber} readOnly />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Order Number
              </label>
              <Input
                value={form.order_number}
                onChange={(e) => handleChange('order_number', e.target.value)}
                placeholder="Order number"
              />
            </div>

            <div className="space-y-3 border rounded-md p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border rounded-md p-3"
                  >
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-xs font-medium">Product *</label>
                      <Select
                        value={item.item}
                        onValueChange={(value) => {
                          const product = products.find((p) => String(p.id) === value)
                          handleItemChange(index, 'item', value)
                          if (product && !item.price) {
                            handleItemChange(index, 'price', String(product.purchase_price || ''))
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                              {p.sku ? ` (${p.sku})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium">Quantity *</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium">Price *</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium">Tax</label>
                      <Input
                        value={item.tax}
                        onChange={(e) => handleItemChange(index, 'tax', e.target.value)}
                        placeholder="Tax ID(s)"
                      />
                    </div>
                    <div className="md:col-span-1 space-y-1">
                      <label className="text-xs font-medium">Discount</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeItemRow(index)}
                        disabled={form.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="md:col-span-12 space-y-1">
                      <label className="text-xs font-medium">Description</label>
                      <Textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
                Save
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

