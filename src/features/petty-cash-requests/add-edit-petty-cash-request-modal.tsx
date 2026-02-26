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
import { pettyCashRequestApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { PettyCashRequest } from './index'

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
  })

  useEffect(() => {
    if (open) {
      if (request) {
        setForm({
          amount: request.amount.toString(),
          comment: request.comment || '',
        })
      } else {
        setForm({
          amount: '',
          comment: '',
        })
      }
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
