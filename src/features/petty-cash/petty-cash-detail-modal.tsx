import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { pettyCashApi } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PettyCashDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expenseId: number | undefined
}

export function PettyCashDetailModal({
  open,
  onOpenChange,
  expenseId,
}: PettyCashDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (open && expenseId) {
      fetchData()
    }
  }, [open, expenseId])

  const fetchData = async () => {
    if (!expenseId) return

    setIsLoading(true)
    try {
      const response = await pettyCashApi.getPettyCash(expenseId)
      setData(response)
    } catch (error: any) {
      console.error('Failed to load expense details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!expenseId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Petty Cash Expense Details</DialogTitle>
          <DialogDescription>View detailed information about this expense</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Reference</p>
                  <p className="font-medium">{data.petty_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{data.date_formatted}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Folio</p>
                  <p className="font-medium">{data.folio || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {data.status === 3 ? (
                      <Badge className="bg-green-500">Approved</Badge>
                    ) : data.status === 2 ? (
                      <Badge className="bg-red-500">Rejected</Badge>
                    ) : (
                      <Badge className="bg-yellow-500">Pending</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Balance Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Balance Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Opening Balance</p>
                  <p className="font-medium">{data.balance_formatted}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utilized Amount</p>
                  <p className="font-medium">{data.grand_total_formatted}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New Balance</p>
                  <p className="font-medium">{data.new_balance_formatted}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Receiver Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Receiver Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Receiver Type</p>
                  <p className="font-medium">{data.receiver_for}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receiver Name</p>
                  <p className="font-medium">{data.receiver_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receiver Phone</p>
                  <p className="font-medium">{data.receiver_phone || '-'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Items</h3>
              {data.items && data.items.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>{item.category_name || '-'}</TableCell>
                          <TableCell>{item.description || '-'}</TableCell>
                          <TableCell className="text-right">{item.amount?.toLocaleString() || '0'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">No items found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
