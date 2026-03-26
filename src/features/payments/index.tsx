import { useState, useEffect } from 'react'
import { Eye, Download, ChevronLeft, ChevronRight, Plus, FileText, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface Payment {
  id: number
  invoice_id: number
  customer_name?: string
  invoice_number: string
  invoice_amount?: number
  invoice_amount_formatted?: string
  invoice_status?: number
  invoice_status_label?: string
  date: string
  date_raw: string
  amount: number
  amount_formatted: string
  amount_usd?: number
  amount_usd_formatted?: string
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
  cmts_sync_status?: 'pending' | 'success' | 'failed' | string
}

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [exportDate, setExportDate] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`
  })
  const [isExporting, setIsExporting] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isFixModalOpen, setIsFixModalOpen] = useState(false)
  const [fixInvoiceNumber, setFixInvoiceNumber] = useState('')
  const [isFixing, setIsFixing] = useState(false)
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

  const getCmtsSyncBadgeVariant = (status?: string): 'default' | 'destructive' | 'secondary' => {
    const normalized = (status || 'pending').toLowerCase()
    if (normalized === 'success') return 'default'
    if (normalized === 'failed') return 'destructive'
    return 'secondary'
  }

  const handleExportByDate = async () => {
    if (!exportDate) return
    let success = false
    try {
      setIsExporting(true)
      const blob = await paymentApi.exportInvoicePaymentsByDate(exportDate)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-payments-${exportDate}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      success = true
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to export payments')
    } finally {
      setIsExporting(false)
      if (success) {
        setIsExportModalOpen(false)
      }
    }
  }

  const handleFixInvoicePayments = async () => {
    if (!fixInvoiceNumber.trim()) {
      toast.error('Please enter invoice number')
      return
    }
    try {
      setIsFixing(true)
      const response = await paymentApi.fixInvoicePayments(fixInvoiceNumber.trim())
      if (response?.status === 200) {
        const deleted = response?.data?.deleted ?? 0
        const updated = response?.data?.updated_amount_usd ?? 0
        toast.success(
          `${response?.message || 'Invoice payments fixed.'} Deleted: ${deleted}, updated USD: ${updated}.`
        )
        setIsFixModalOpen(false)
        setFixInvoiceNumber('')
        fetchPayments(1, pagination.per_page, search)
      } else {
        toast.error(response?.message || 'Failed to fix invoice payments')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to fix invoice payments')
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center justify-between w-full'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Receive Payments</h1>
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
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsExportModalOpen(true)}
                disabled={isExporting}
              >
                <Download className='mr-2 h-4 w-4' />
                Export
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsFixModalOpen(true)}
                disabled={isFixing}
              >
                <Wrench className='mr-2 h-4 w-4' />
                Fix Invoice Payments
              </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Payment
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
                      <TableHead>Customer</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('invoice_number')}
                      >
                        Invoice Number {renderSortIcon('invoice_number')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted text-right'
                        onClick={() => handleSort('invoice_amount')}
                      >
                        Invoice Amount {renderSortIcon('invoice_amount')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted text-right'
                        onClick={() => handleSort('amount')}
                      >
                        Paid Amount {renderSortIcon('amount')}
                      </TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CMTS Sync</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.customer_name || '--'}</TableCell>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <FileText className='h-4 w-4 text-muted-foreground' />
                            {payment.invoice_number}
                          </div>
                        </TableCell>
                        <TableCell className='text-right'>
                          {payment.invoice_amount_formatted || '-'}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex flex-col items-end'>
                            <span>{payment.amount_formatted}</span>
                            {payment.amount_usd_formatted ? (
                              <span className='text-xs text-muted-foreground'>
                                USD: {payment.amount_usd_formatted}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{payment.account_name}</TableCell>
                        <TableCell>{payment.invoice_status_label || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getCmtsSyncBadgeVariant(payment.cmts_sync_status)}>
                            {payment.cmts_sync_status || 'pending'}
                          </Badge>
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

      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className='max-w-[95vw]! w-[95vw]! sm:max-w-[420px]'>
          <DialogHeader>
            <DialogTitle>Export Payments</DialogTitle>
          </DialogHeader>

          <div className='space-y-2'>
            <label className='block text-sm font-medium'>
              Select date <span className='text-destructive'>*</span>
            </label>
            <Input
              type='date'
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
              disabled={isExporting}
            />
          </div>

          <div className='flex justify-end gap-2 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsExportModalOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => void handleExportByDate()}
              disabled={isExporting || !exportDate}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFixModalOpen} onOpenChange={setIsFixModalOpen}>
        <DialogContent className='max-w-[95vw]! w-[95vw]! sm:max-w-[420px]'>
          <DialogHeader>
            <DialogTitle>Fix Invoice Payments</DialogTitle>
          </DialogHeader>

          <div className='space-y-2'>
            <label className='block text-sm font-medium'>
              Invoice number <span className='text-destructive'>*</span>
            </label>
            <Input
              type='text'
              value={fixInvoiceNumber}
              onChange={(e) => setFixInvoiceNumber(e.target.value)}
              placeholder='e.g. BN+E188F3F3'
              disabled={isFixing}
            />
            <p className='text-xs text-muted-foreground'>
              This will correct malformed USD amounts and remove duplicate/overflow payment rows.
            </p>
          </div>

          <div className='flex justify-end gap-2 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsFixModalOpen(false)}
              disabled={isFixing}
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={() => void handleFixInvoicePayments()}
              disabled={isFixing || !fixInvoiceNumber.trim()}
            >
              {isFixing ? 'Fixing...' : 'Fix Now'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
