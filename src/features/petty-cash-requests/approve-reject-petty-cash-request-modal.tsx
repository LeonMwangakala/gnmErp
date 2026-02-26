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

interface ApproveRejectPettyCashRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: PettyCashRequest | null
  status: 2 | 3 | null
  onSuccess: () => void
}

export function ApproveRejectPettyCashRequestModal({
  open,
  onOpenChange,
  request,
  status,
  onSuccess,
}: ApproveRejectPettyCashRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    from_bank_account: '',
    approved_amount: '',
    approved_comment: '',
  })
  const [bankAccounts, setBankAccounts] = useState<Array<{
    id: number
    holder_name: string
    opening_balance: number
    opening_balance_formatted: string
  }>>([])
  const [selectedAccountBalance, setSelectedAccountBalance] = useState<number | null>(null)

  useEffect(() => {
    if (open && request) {
      fetchFormData()
      setForm({
        from_bank_account: '',
        approved_amount: status === 3 ? request.amount.toString() : '',
        approved_comment: '',
      })
      setSelectedAccountBalance(null)
    }
  }, [open, request, status])

  const fetchFormData = async () => {
    try {
      const response = await pettyCashRequestApi.getFormData()
      setBankAccounts(response.bank_accounts || [])
    } catch (error: any) {
      toast.error('Failed to load form data')
    }
  }

  const handleAccountChange = (accountId: string) => {
    setForm({ ...form, from_bank_account: accountId })
    const account = bankAccounts.find((acc) => acc.id.toString() === accountId)
    setSelectedAccountBalance(account ? account.opening_balance : null)
  }

  const handleAmountChange = (amount: string) => {
    setForm({ ...form, approved_amount: amount })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.approved_comment.trim()) {
      toast.error('Comments are required')
      return
    }

    if (status === 3) {
      if (!form.from_bank_account) {
        toast.error('Please select a bank account')
        return
      }
      if (!form.approved_amount || parseFloat(form.approved_amount) <= 0) {
        toast.error('Please enter a valid approved amount')
        return
      }
      if (selectedAccountBalance !== null && parseFloat(form.approved_amount) > selectedAccountBalance) {
        toast.error('Account balance is less than approved amount')
        return
      }
    }

    if (!request) return

    setIsSubmitting(true)

    try {
      await pettyCashRequestApi.approvePettyCashRequest(request.id, {
        status,
        approved_amount: status === 3 ? parseFloat(form.approved_amount) : 0,
        approved_comment: form.approved_comment,
        from_bank_account: status === 3 ? parseInt(form.from_bank_account) : null,
      })
      toast.success(status === 3 ? 'Request approved successfully' : 'Request rejected successfully')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process request')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!request || !status) return null

  const isApproval = status === 3
  const title = isApproval ? 'Approve Petty Cash Request' : 'Reject Petty Cash Request'
  const buttonText = isApproval ? 'Approve' : 'Reject'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isApproval
              ? 'Approve this petty cash request and transfer funds'
              : 'Reject this petty cash request'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {isApproval && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_bank_account">
                      Transfer From <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.from_bank_account}
                      onValueChange={handleAccountChange}
                      required={isApproval}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.holder_name} [{account.opening_balance_formatted}]
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balance">Balance</Label>
                    <Input
                      id="balance"
                      value={selectedAccountBalance !== null ? selectedAccountBalance.toLocaleString() : ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requested_amount">Requested Amount</Label>
                    <Input
                      id="requested_amount"
                      value={request.amount_formatted}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approved_amount">
                      Approved Amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="approved_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.approved_amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      required={isApproval}
                      placeholder="Enter approved amount"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="approved_comment">
                Comments <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="approved_comment"
                value={form.approved_comment}
                onChange={(e) => setForm({ ...form, approved_comment: e.target.value })}
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
            <Button
              type="submit"
              disabled={isSubmitting}
              className={isApproval ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
