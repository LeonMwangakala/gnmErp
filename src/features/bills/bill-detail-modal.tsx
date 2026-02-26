import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { billApi } from '@/lib/api'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface BillDetail {
  id: number
  bill_id: string
  bill_number: string
  vender_id: number
  vender: {
    id: number
    name: string
  } | null
  category_id: number
  category: {
    id: number
    name: string
  } | null
  bill_date: string
  bill_date_raw: string
  due_date: string
  due_date_raw: string
  status: number
  status_label: string
  order_number: string
  sub_total: number
  sub_total_formatted: string
  total_tax: number
  total_tax_formatted: string
  total_discount: number
  total_discount_formatted: string
  total: number
  total_formatted: string
  due: number
  due_formatted: string
  items: Array<{
    id: number
    product_id: number
    product_name: string
    quantity: number
    price: number
    tax: number | null
    discount: number
    description: string
  }>
}

const statusColors: Record<number, string> = {
  0: 'bg-secondary',
  1: 'bg-yellow-500',
  2: 'bg-destructive',
  3: 'bg-blue-500',
  4: 'bg-green-500',
}

interface BillDetailModalProps {
  billId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BillDetailModal({ billId, open, onOpenChange }: BillDetailModalProps) {
  const [bill, setBill] = useState<BillDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && billId) {
      fetchBill()
    } else {
      setBill(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, billId])

  const fetchBill = async () => {
    if (!billId) return

    try {
      setIsLoading(true)
      const data = await billApi.getBill(billId)
      setBill(data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load bill details')
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: number) => {
    const statusLabels: Record<number, string> = {
      0: 'Draft',
      1: 'Sent',
      2: 'Unpaid',
      3: 'Partially Paid',
      4: 'Paid',
    }

    const label = statusLabels[status] || 'Unknown'
    const color = statusColors[status] || 'bg-gray-500'

    return (
      <Badge className={color} variant="default">
        {label}
      </Badge>
    )
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto sm:!max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Bill Details</DialogTitle>
          <DialogDescription>View bill information and items</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !bill ? (
          <div className="text-center py-8 text-muted-foreground">
            Bill not found.
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Bill Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bill Number:</span>
                      <span className="font-medium">{bill.bill_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span className="font-medium">{bill.vender?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium">{bill.category?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bill Date:</span>
                      <span className="font-medium">{bill.bill_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className="font-medium">{bill.due_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order Number:</span>
                      <span className="font-medium">{bill.order_number || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(bill.status)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Totals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sub Total:</span>
                      <span className="font-medium">{bill.sub_total_formatted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="font-medium">{bill.total_tax_formatted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="font-medium">{bill.total_discount_formatted}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Total:</span>
                      <span className="font-semibold text-lg">{bill.total_formatted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due:</span>
                      <span className="font-medium">{bill.due_formatted}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Items</CardTitle>
                  <CardDescription>Bill items and products</CardDescription>
                </CardHeader>
                <CardContent>
                  {bill.items && bill.items.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Tax</TableHead>
                            <TableHead className="text-right">Discount</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bill.items.map((item) => {
                            const itemTotal = (item.price * item.quantity) - item.discount
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  {item.product_name}
                                  {item.description && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {item.description}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {Number(item.quantity).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {Number(item.price).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.tax ? String(item.tax) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {Number(item.discount).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {Number(itemTotal).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No items found.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
