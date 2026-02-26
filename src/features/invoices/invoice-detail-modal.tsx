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
import { invoiceApi } from '@/lib/api'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface InvoiceDetail {
  id: number
  invoice_number: string
  subject: string
  customer_id: number
  customer: {
    id: number
    name: string
    email: string
    contact: string
  }
  issue_date: string
  issue_date_raw: string
  due_date: string
  due_date_raw: string
  is_overdue: boolean
  status: number
  status_label: string
  ref_number: string
  currency: string
  show_quantity_as: string
  invoice_client_notes: string
  invoice_terms_condition: string
  items: Array<{
    id: number
    product_name: string
    quantity: number
    price: number
    tax: number | null
    tax_rate: number
    discount: number
    item_total: number
    item_tax: number
    item_discount: number
    item_amount: number
  }>
  totals: {
    subtotal: number
    subtotal_formatted: string
    tax: number
    tax_formatted: string
    discount: number
    discount_formatted: string
    total: number
    total_formatted: string
    paid: number
    paid_formatted: string
    credit_note: number
    credit_note_formatted: string
    due: number
    due_formatted: string
  }
}

interface Payment {
  id: number
  date: string
  date_raw: string
  amount: number
  amount_formatted: string
  payment_method: string
  reference: string
  description: string
  account_id: number | null
  receipt: string
}

interface CreditNote {
  id: number
  date: string
  date_raw: string
  amount: number
  amount_formatted: string
  description: string
}

interface InvoiceDetailModalProps {
  invoiceId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceDetailModal({
  invoiceId,
  open,
  onOpenChange,
}: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [creditNotesLoading, setCreditNotesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalPaidFormatted, setTotalPaidFormatted] = useState('0.00')
  const [totalCreditNote, setTotalCreditNote] = useState(0)
  const [totalCreditNoteFormatted, setTotalCreditNoteFormatted] = useState('0.00')

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoice()
      setActiveTab('overview')
    } else {
      // Reset state when modal closes
      setInvoice(null)
      setPayments([])
      setCreditNotes([])
      setTotalPaid(0)
      setTotalPaidFormatted('0.00')
      setTotalCreditNote(0)
      setTotalCreditNoteFormatted('0.00')
    }
  }, [open, invoiceId])

  useEffect(() => {
    if (open && invoiceId && activeTab === 'payments') {
      fetchPayments()
    }
  }, [open, invoiceId, activeTab])

  useEffect(() => {
    if (open && invoiceId && activeTab === 'credit-notes') {
      fetchCreditNotes()
    }
  }, [open, invoiceId, activeTab])

  const fetchInvoice = async () => {
    if (!invoiceId) return
    try {
      setIsLoading(true)
      const data = await invoiceApi.getInvoice(invoiceId)
      setInvoice(data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load invoice')
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPayments = async () => {
    if (!invoiceId) return
    try {
      setPaymentsLoading(true)
      const response = await invoiceApi.getInvoicePayments(invoiceId)
      setPayments(response.data)
      setTotalPaid(response.total_paid)
      setTotalPaidFormatted(response.total_paid_formatted)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load payments')
    } finally {
      setPaymentsLoading(false)
    }
  }

  const fetchCreditNotes = async () => {
    if (!invoiceId) return
    try {
      setCreditNotesLoading(true)
      const response = await invoiceApi.getInvoiceCreditNotes(invoiceId)
      setCreditNotes(response.data)
      setTotalCreditNote(response.total_credit_note)
      setTotalCreditNoteFormatted(response.total_credit_note_formatted)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load credit notes')
    } finally {
      setCreditNotesLoading(false)
    }
  }

  const getStatusBadge = (status: number, isOverdue: boolean) => {
    if (isOverdue) {
      return <Badge variant='destructive'>Overdue</Badge>
    }
    switch (status) {
      case 0:
        return <Badge variant='secondary'>Draft</Badge>
      case 1:
        return (
          <Badge variant='outline' className='bg-yellow-500 text-white border-yellow-500'>
            Sent
          </Badge>
        )
      case 2:
        return <Badge variant='destructive'>Unpaid</Badge>
      case 3:
        return <Badge variant='default'>Partial Paid</Badge>
      case 4:
        return (
          <Badge variant='default' className='bg-green-500 text-white'>
            Paid
          </Badge>
        )
      default:
        return <Badge variant='secondary'>Unknown</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto !sm:max-w-[95vw] !md:max-w-[95vw] !lg:max-w-[90vw] !xl:max-w-[85vw]'>
        <DialogHeader>
          <DialogTitle>
            {invoice ? `Invoice #${invoice.invoice_number}` : 'Invoice Details'}
          </DialogTitle>
          <DialogDescription>
            {invoice && invoice.subject && `Subject: ${invoice.subject}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : invoice ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='payments'>
                Payments ({payments.length})
              </TabsTrigger>
              <TabsTrigger value='credit-notes'>
                Credit Notes ({creditNotes.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='space-y-4'>
              {/* Invoice Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    <div>
                      <p className='text-sm text-muted-foreground'>Invoice Number</p>
                      <p className='font-medium'>{invoice.invoice_number}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Customer</p>
                      <p className='font-medium'>{invoice.customer.name}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Issue Date</p>
                      <p className='font-medium'>{invoice.issue_date}</p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Due Date</p>
                      <p className={`font-medium ${invoice.is_overdue ? 'text-destructive' : ''}`}>
                        {invoice.due_date}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-muted-foreground'>Status</p>
                      <div className='mt-1'>{getStatusBadge(invoice.status, invoice.is_overdue)}</div>
                    </div>
                    {invoice.ref_number && (
                      <div>
                        <p className='text-sm text-muted-foreground'>Reference Number</p>
                        <p className='font-medium'>{invoice.ref_number}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className='text-center'>{invoice.show_quantity_as}</TableHead>
                          <TableHead className='text-right'>Rate</TableHead>
                          <TableHead className='text-right'>Tax</TableHead>
                          <TableHead className='text-right'>Discount</TableHead>
                          <TableHead className='text-right'>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell className='text-center'>{item.quantity}</TableCell>
                            <TableCell className='text-right'>
                              {typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className='text-right'>
                              {item.item_tax > 0 ? (typeof item.item_tax === 'number' ? item.item_tax.toFixed(2) : parseFloat(item.item_tax || 0).toFixed(2)) : '-'}
                            </TableCell>
                            <TableCell className='text-right'>
                              {item.item_discount > 0 ? (typeof item.item_discount === 'number' ? item.item_discount.toFixed(2) : parseFloat(item.item_discount || 0).toFixed(2)) : '-'}
                            </TableCell>
                            <TableCell className='text-right'>
                              {typeof item.item_amount === 'number' ? item.item_amount.toFixed(2) : parseFloat(item.item_amount || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Totals */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Subtotal:</span>
                      <span className='font-medium'>{invoice.totals.subtotal_formatted}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Tax:</span>
                      <span className='font-medium'>{invoice.totals.tax_formatted}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Discount:</span>
                      <span className='font-medium'>{invoice.totals.discount_formatted}</span>
                    </div>
                    <div className='flex justify-between border-t pt-2'>
                      <span className='font-semibold'>Total:</span>
                      <span className='font-semibold text-lg'>{invoice.totals.total_formatted}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Paid:</span>
                      <span className='font-medium'>{invoice.totals.paid_formatted}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Credit Note:</span>
                      <span className='font-medium'>{invoice.totals.credit_note_formatted}</span>
                    </div>
                    <div className='flex justify-between border-t pt-2'>
                      <span className='font-semibold'>Due:</span>
                      <span className={`font-semibold text-lg ${invoice.is_overdue ? 'text-destructive' : ''}`}>
                        {invoice.totals.due_formatted}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes and Terms */}
              {(invoice.invoice_client_notes || invoice.invoice_terms_condition) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes & Terms</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    {invoice.invoice_client_notes && (
                      <div>
                        <p className='text-sm font-semibold mb-2'>Notes:</p>
                        <p className='text-sm text-muted-foreground whitespace-pre-wrap'>
                          {invoice.invoice_client_notes}
                        </p>
                      </div>
                    )}
                    {invoice.invoice_terms_condition && (
                      <div>
                        <p className='text-sm font-semibold mb-2'>Terms and Conditions:</p>
                        <p className='text-sm text-muted-foreground whitespace-pre-wrap'>
                          {invoice.invoice_terms_condition}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value='payments' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Payments</CardTitle>
                  <CardDescription>
                    Total Paid: {totalPaidFormatted}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentsLoading ? (
                    <div className='flex items-center justify-center py-8'>
                      <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                    </div>
                  ) : payments.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      No payments found
                    </div>
                  ) : (
                    <div className='rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S/N</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className='text-right'>Amount</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((payment, index) => (
                            <TableRow key={payment.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{payment.date}</TableCell>
                              <TableCell className='text-right'>{payment.amount_formatted}</TableCell>
                              <TableCell>{payment.payment_method || '-'}</TableCell>
                              <TableCell>{payment.reference || '-'}</TableCell>
                              <TableCell>{payment.description || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='credit-notes' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Credit Notes</CardTitle>
                  <CardDescription>
                    Total Credit Note: {totalCreditNoteFormatted}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {creditNotesLoading ? (
                    <div className='flex items-center justify-center py-8'>
                      <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                    </div>
                  ) : creditNotes.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      No credit notes found
                    </div>
                  ) : (
                    <div className='rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S/N</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className='text-right'>Amount</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {creditNotes.map((creditNote, index) => (
                            <TableRow key={creditNote.id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{creditNote.date}</TableCell>
                              <TableCell className='text-right'>{creditNote.amount_formatted}</TableCell>
                              <TableCell>{creditNote.description || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
