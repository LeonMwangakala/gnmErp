import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { pettyCashRequestApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { PettyCashRequest } from './index'

interface CurrencyOption {
  id: number
  currency_name: string
  currency_symbol: string
  currency_code: string
  base: number
}

interface AddEditPettyCashRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: PettyCashRequest | null
  onSuccess: () => void
}

export function AddEditPettyCashRequestModal({
  open,
  onOpenChange,
  request,
  onSuccess,
}: AddEditPettyCashRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    comment: '',
    currency: '',
  })
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([])

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const data = await pettyCashRequestApi.getFormData()
        const loadedCurrencies: CurrencyOption[] = data.currencies || []
        setCurrencies(loadedCurrencies)

        // Determine default currency (base) if available
        const baseCurrency = loadedCurrencies.find((c) => c.base === 1) || loadedCurrencies[0]

        if (request) {
          setForm({
            amount: request.amount.toString(),
            comment: request.comment || '',
            currency: request.currency_id ? request.currency_id.toString() : baseCurrency ? baseCurrency.id.toString() : '',
          })
        } else {
          setForm({
            amount: '',
            comment: '',
            currency: baseCurrency ? baseCurrency.id.toString() : '',
          })
        }
      } catch (error: any) {
        // If loading form data fails, still allow basic amount/comment submission
        console.error('Failed to load petty cash request form data', error)
      }
    }

    if (open) {
      void loadFormData()
    }
  }, [open, request])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (request) {
        await pettyCashRequestApi.updatePettyCashRequest(request.id, form)
        toast.success('Petty cash request updated successfully')
      } else {
        await pettyCashRequestApi.createPettyCashRequest(form)
        toast.success('Petty cash request created successfully')
      }
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save petty cash request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {request ? 'Edit Petty Cash Request' : 'Create Petty Cash Request'}
          </DialogTitle>
          <DialogDescription>
            {request
              ? 'Update the petty cash request details'
              : 'Create a new petty cash request'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">
                Currency <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.currency}
                onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id.toString()}>
                      {currency.currency_code} - {currency.currency_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Exchange rate is auto-handled by the system for petty cash requests.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">
                Comments <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="comment"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                required
                placeholder="Enter comments"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
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
              {request ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
