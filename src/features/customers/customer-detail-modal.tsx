import { useState, useEffect } from 'react'
import { Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { customerApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { EMPTY_INVOICE_REFS, useInvoiceContainers } from './use-invoice-containers'

interface CustomerDetail {
  id: number
  customer_number: string
  name: string
  short_name: string
  email: string
  contact: string
  tax_number: string
  vrn: string
  balance: number
  balance_formatted: string
  created_at: string
  billing: {
    name: string
    phone: string
    country: string
    state: string
    city: string
    zip: string
    address: string
  }
  shipping: {
    name: string
    phone: string
    country: string
    state: string
    city: string
    zip: string
    address: string
  }
  statistics: {
    total_invoice_sum: number
    total_invoice_sum_formatted: string
    total_invoice_count: number
    average_sale: number
    average_sale_formatted: string
    overdue: number
    overdue_formatted: string
  }
}

interface Invoice {
  id: number
  invoice_number: string
  ref_number: string
  customer_name: string
  issue_date: string
  due_date: string
  due_date_raw: string
  is_overdue: boolean
  total_tax: number
  total_tax_formatted: string
  amount: number
  amount_formatted: string
  due_amount: number
  due_amount_formatted: string
  status: number
  status_label: string
}

interface CustomerDetailModalProps {
  customerId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailModal({
  customerId,
  open,
  onOpenChange,
}: CustomerDetailModalProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  })
  const [activeTab, setActiveTab] = useState('info')

  const { containerByInvoiceId, containersLoading } = useInvoiceContainers(
    activeTab === 'invoices' ? invoices : EMPTY_INVOICE_REFS
  )

  useEffect(() => {
    if (open && customerId) {
      fetchCustomer()
      setActiveTab('info')
    } else {
      // Reset state when modal closes
      setCustomer(null)
      setInvoices([])
      setPagination({
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      })
    }
  }, [open, customerId])

  useEffect(() => {
    if (open && customerId && activeTab === 'invoices') {
      fetchInvoices()
    }
  }, [open, customerId, activeTab, pagination.current_page, pagination.per_page])

  const fetchCustomer = async () => {
    if (!customerId) return
    try {
      setIsLoading(true)
      const data = await customerApi.getCustomer(customerId)
      setCustomer(data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load customer')
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInvoices = async () => {
    if (!customerId) return
    try {
      setInvoicesLoading(true)
      const response = await customerApi.getCustomerInvoices(customerId, {
        page: pagination.current_page,
        per_page: pagination.per_page,
      })
      setInvoices(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load invoices')
    } finally {
      setInvoicesLoading(false)
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
        return <Badge variant='default'>Partial</Badge>
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
            {customer ? customer.name : 'Customer Details'}
          </DialogTitle>
          <DialogDescription>
            {customer && `Customer Number: ${customer.customer_number}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : customer ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
            <TabsList>
              <TabsTrigger value='info'>Customer Info</TabsTrigger>
              <TabsTrigger value='invoices'>
                Invoices ({customer.statistics.total_invoice_count})
              </TabsTrigger>
            </TabsList>

            <TabsContent value='info' className='space-y-4'>
              {/* Customer Statistics */}
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardDescription>Total Invoice Sum</CardDescription>
                    <CardTitle className='text-2xl'>
                      {customer.statistics.total_invoice_sum_formatted}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardDescription>Total Invoices</CardDescription>
                    <CardTitle className='text-2xl'>
                      {customer.statistics.total_invoice_count}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardDescription>Balance</CardDescription>
                    <CardTitle className='text-2xl'>{customer.balance_formatted}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardDescription>Overdue</CardDescription>
                    <CardTitle className='text-2xl'>
                      {customer.statistics.overdue_formatted}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Short Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>TIN</TableHead>
                          <TableHead>VRN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell>{customer.short_name}</TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>{customer.contact}</TableCell>
                          <TableCell>{customer.tax_number || '-'}</TableCell>
                          <TableCell>{customer.vrn || '-'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Billing Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Zip</TableHead>
                          <TableHead>Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>{customer.billing.name || '-'}</TableCell>
                          <TableCell>{customer.billing.phone || '-'}</TableCell>
                          <TableCell>{customer.billing.country || '-'}</TableCell>
                          <TableCell>{customer.billing.state || '-'}</TableCell>
                          <TableCell>{customer.billing.city || '-'}</TableCell>
                          <TableCell>{customer.billing.zip || '-'}</TableCell>
                          <TableCell>{customer.billing.address || '-'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Zip</TableHead>
                          <TableHead>Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>{customer.shipping.name || '-'}</TableCell>
                          <TableCell>{customer.shipping.phone || '-'}</TableCell>
                          <TableCell>{customer.shipping.country || '-'}</TableCell>
                          <TableCell>{customer.shipping.state || '-'}</TableCell>
                          <TableCell>{customer.shipping.city || '-'}</TableCell>
                          <TableCell>{customer.shipping.zip || '-'}</TableCell>
                          <TableCell>{customer.shipping.address || '-'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='invoices' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Customer Invoices</CardTitle>
                  <CardDescription>
                    {pagination.total > 0 &&
                      `Showing ${pagination.from} to ${pagination.to} of ${pagination.total} invoices`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className='flex items-center justify-center py-8'>
                      <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      No invoices found
                    </div>
                  ) : (
                    <div className='rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice#</TableHead>
                            <TableHead>Container#</TableHead>
                            <TableHead>Issue Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className='text-right'>Total Tax</TableHead>
                            <TableHead className='text-right'>Amount</TableHead>
                            <TableHead className='text-right'>Due Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className='font-medium'>
                                {invoice.invoice_number}
                              </TableCell>
                              <TableCell className='max-w-[220px] font-mono text-xs'>
                                {containersLoading ? (
                                  <span className='text-muted-foreground'>…</span>
                                ) : (
                                  containerByInvoiceId[invoice.id] ?? '-'
                                )}
                              </TableCell>
                              <TableCell>{invoice.issue_date}</TableCell>
                              <TableCell>
                                {invoice.is_overdue ? (
                                  <span className='text-destructive'>{invoice.due_date}</span>
                                ) : (
                                  invoice.due_date
                                )}
                              </TableCell>
                              <TableCell className='text-right'>
                                {invoice.total_tax_formatted}
                              </TableCell>
                              <TableCell className='text-right'>{invoice.amount_formatted}</TableCell>
                              <TableCell className='text-right'>
                                {invoice.due_amount_formatted}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(invoice.status, invoice.is_overdue)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {!invoicesLoading && pagination.total > 0 && (
                    <div className='flex items-center justify-between mt-4 pt-4 border-t'>
                      <div className='text-sm text-muted-foreground'>
                        Showing {pagination.from} to {pagination.to} of {pagination.total} invoices
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              current_page: prev.current_page - 1,
                            }))
                          }
                          disabled={pagination.current_page === 1}
                        >
                          <ChevronLeft className='h-4 w-4' />
                          Previous
                        </Button>
                        <div className='flex items-center gap-1'>
                          {Array.from(
                            { length: Math.min(5, pagination.last_page) },
                            (_, i) => {
                              let pageNum: number
                              if (pagination.last_page <= 5) {
                                pageNum = i + 1
                              } else if (pagination.current_page <= 3) {
                                pageNum = i + 1
                              } else if (
                                pagination.current_page >=
                                pagination.last_page - 2
                              ) {
                                pageNum = pagination.last_page - 4 + i
                              } else {
                                pageNum = pagination.current_page - 2 + i
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    pagination.current_page === pageNum ? 'default' : 'outline'
                                  }
                                  size='sm'
                                  onClick={() =>
                                    setPagination((prev) => ({ ...prev, current_page: pageNum }))
                                  }
                                  className='w-10'
                                >
                                  {pageNum}
                                </Button>
                              )
                            }
                          )}
                        </div>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              current_page: prev.current_page + 1,
                            }))
                          }
                          disabled={pagination.current_page === pagination.last_page}
                        >
                          Next
                          <ChevronRight className='h-4 w-4' />
                        </Button>
                      </div>
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
