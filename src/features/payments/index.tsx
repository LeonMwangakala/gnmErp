import { useState, useEffect } from 'react'
import { Eye, Download, Search, ChevronLeft, ChevronRight, Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { paymentApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AddPaymentModal } from './add-payment-modal'

export interface Payment {
  id: number
  invoice_id: number
  invoice_number: string
  date: string
  date_raw: string
  amount: number
  amount_formatted: string
  payment_type: string
  payment_method: string
  account_id: number | null
  account_name: string
  reference: string
  description: string
  receipt: string
  receipt_url: string | null
  currency_id?: number | null
  currency_code?: string | null
  currency_symbol?: string | null
}

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  })
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchInput, setSearchInput] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput)
        setPagination((prev) => ({ ...prev, current_page: 1 }))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput, search])

  // Fetch payments when pagination, sort, or search changes
  useEffect(() => {
    fetchPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, sortBy, sortOrder, search])

  const fetchPayments = async (
    page?: number,
    perPage?: number,
    searchTerm?: string
  ) => {
    try {
      setIsLoading(true)
      const currentPage = page ?? pagination.current_page
      const currentPerPage = perPage ?? pagination.per_page
      const currentSearch = searchTerm ?? search

      const response = await paymentApi.getPayments({
        page: currentPage,
        per_page: currentPerPage,
        search: currentSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setPayments(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      setPagination((prev) => ({ ...prev, current_page: newPage }))
    }
  }

  const handlePerPageChange = (newPerPage: number) => {
    setPagination((prev) => ({ ...prev, per_page: newPerPage, current_page: 1 }))
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? '↑' : '↓'
    }
    return null
  }

  const handleViewReceipt = (receiptUrl: string | null) => {
    if (receiptUrl) {
      window.open(receiptUrl, '_blank')
    } else {
      toast.info('No receipt available')
    }
  }

  const handleDownloadReceipt = (receiptUrl: string | null) => {
    if (receiptUrl) {
      const link = document.createElement('a')
      link.href = receiptUrl
      link.download = ''
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      toast.info('No receipt available')
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center justify-between w-full'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Invoice Payments</h1>
            <p className='text-muted-foreground'>
              Manage invoice payments and receipts
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Input
              placeholder='Search payments...'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className='max-w-sm'
            />
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Payment
            </Button>
          </div>
        </div>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Payment List</CardTitle>
            <CardDescription>
              View and manage all invoice payments
              {pagination.total > 0 && (
                <span className='ml-2'>
                  ({pagination.from}-{pagination.to} of {pagination.total})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('invoice_number')}
                      >
                        Invoice {renderSortIcon('invoice_number')}
                      </TableHead>
                      <TableHead>Payment Receipt</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('date')}
                      >
                        Date {renderSortIcon('date')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted text-right'
                        onClick={() => handleSort('amount')}
                      >
                        Amount {renderSortIcon('amount')}
                      </TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('payment_type')}
                      >
                        Payment Type {renderSortIcon('payment_type')}
                      </TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </TableCell>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <FileText className='h-4 w-4 text-muted-foreground' />
                            {payment.invoice_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.receipt_url ? (
                            <div className='flex items-center gap-2'>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 w-8 p-0'
                                onClick={() => handleViewReceipt(payment.receipt_url)}
                                title='View Receipt'
                              >
                                <Eye className='h-4 w-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 w-8 p-0'
                                onClick={() => handleDownloadReceipt(payment.receipt_url)}
                                title='Download Receipt'
                              >
                                <Download className='h-4 w-4' />
                              </Button>
                            </div>
                          ) : (
                            <span className='text-muted-foreground'>-</span>
                          )}
                        </TableCell>
                        <TableCell>{payment.date}</TableCell>
                        <TableCell className='text-right'>{payment.amount_formatted}</TableCell>
                        <TableCell>
                          {payment.currency_code
                            ? payment.currency_code
                            : 'Base'}
                        </TableCell>
                        <TableCell>{payment.payment_type || '-'}</TableCell>
                        <TableCell>{payment.account_name}</TableCell>
                        <TableCell>{payment.reference}</TableCell>
                        <TableCell>{payment.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && pagination.total > 0 && (
              <div className='flex items-center justify-between mt-4 pt-4 border-t'>
                <div className='text-sm text-muted-foreground'>
                  Showing {pagination.from} to {pagination.to} of {pagination.total} payments
                </div>
                <div className='flex items-center gap-2'>
                  <Select
                    value={String(pagination.per_page)}
                    onValueChange={(value) => handlePerPageChange(Number(value))}
                  >
                    <SelectTrigger className='h-8 w-[100px]'>
                      <SelectValue placeholder='Per Page' />
                    </SelectTrigger>
                    <SelectContent side='top'>
                      {[10, 15, 25, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={String(pageSize)}>
                          {pageSize} per page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                  >
                    <ChevronLeft className='h-4 w-4' />
                    Previous
                  </Button>
                  <div className='flex items-center gap-1'>
                    {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <Button
                          key={pageNum}
                          variant={
                            pagination.current_page === pageNum ? 'default' : 'outline'
                          }
                          size='sm'
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handlePageChange(pagination.current_page + 1)}
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
      </Main>

      <AddPaymentModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          // Refresh payments after a successful create
          fetchPayments(1, pagination.per_page, search)
        }}
      />
    </>
  )
}
