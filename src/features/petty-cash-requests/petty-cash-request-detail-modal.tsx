import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { PettyCashRequest } from './index'

interface PettyCashRequestDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: PettyCashRequest | null
}

export function PettyCashRequestDetailModal({
  open,
  onOpenChange,
  request,
}: PettyCashRequestDetailModalProps) {
  if (!request) return null

  const getStatusBadge = (status: number | null) => {
    if (status === 3) {
      return <Badge className="bg-green-500">Approved</Badge>
    } else if (status === 2) {
      return <Badge className="bg-red-500">Rejected</Badge>
    } else {
      return <Badge className="bg-yellow-500">Pending</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Petty Cash Request Details</DialogTitle>
          <DialogDescription>View detailed information about this request</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Request Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Request Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Request Number</p>
                  <p className="font-medium">{request.request_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(request.status)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Requested Amount</p>
                  <p className="font-medium">{request.amount_formatted}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested By</p>
                  <p className="font-medium">{request.request_user_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Requested On</p>
                  <p className="font-medium">{request.requested_on_formatted}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comments</p>
                <p className="font-medium mt-1">{request.comment || '-'}</p>
              </div>
            </div>
          </div>

          {/* Approval Details */}
          {(request.status === 2 || request.status === 3) && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Approval Details</h3>
                <div className="space-y-3">
                  {request.status === 3 && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Approved Amount</p>
                        <p className="font-medium">{request.approved_amount_formatted || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Approved By</p>
                        <p className="font-medium">{request.approved_by_name || '-'}</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Approved On</p>
                      <p className="font-medium">{request.approved_on_formatted || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approval Comments</p>
                    <p className="font-medium mt-1">{request.approved_comment || '-'}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
