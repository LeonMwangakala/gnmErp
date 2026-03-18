import { useState, useEffect } from 'react'
import { Eye, Download, Search, ChevronLeft, ChevronRight, Send, Filter } from 'lucide-react'
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
import { Main } from '@/components/layout/main'
import { invoiceApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { InvoiceDetailModal } from './invoice-detail-modal'
import { PostInvoicesModal } from './post-invoices-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface Invoice {
  id: number
  invoice_number: string
  subject: string
  customer_id: number
  customer_name: string
  issue_date: string
  issue_date_raw: string
  due_date: string
  due_date_raw: string
  is_overdue: boolean
  amount: number
  amount_formatted: string
  tax: number
  tax_formatted: string
  discount: number
  discount_formatted: string
  due: number
  due_formatted: string
  status: number
  status_label: string
}

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
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
  const [statusFilter, setStatusFilter] = useState<number[]>([])
  const [isPostInvoicesModalOpen, setIsPostInvoicesModalOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput)
        // Reset to page 1 when search changes
        setPagination((prev) => ({ ...prev, current_page: 1 }))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput, search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch invoices when pagination, sort, search, or status filter changes
  useEffect(() => {
    fetchInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, sortBy, sortOrder, search, statusFilter])

  const fetchInvoices = async (
    page?: number,
    perPage?: number,
    searchTerm?: string
  ) => {
    try {
      setIsLoading(true)
      const currentPage = page ?? pagination.current_page
      const currentPerPage = perPage ?? pagination.per_page
      const currentSearch = searchTerm ?? search

      const response = await invoiceApi.getInvoices({
        page: currentPage,
        per_page: currentPerPage,
        search: currentSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        status: statusFilter.length > 0 ? statusFilter : undefined,
      })
      setInvoices(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load invoices')
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

  const handleStatusFilterChange = (status: number) => {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status)
      } else {
        return [...prev, status]
      }
    })
    // Reset to page 1 when filter changes
    setPagination((prev) => ({ ...prev, current_page: 1 }))
  }

  const clearStatusFilter = () => {
    setStatusFilter([])
    setPagination((prev) => ({ ...prev, current_page: 1 }))
  }

  const statusOptions = [
    { value: 0, label: 'Draft' },
    { value: 1, label: 'Sent' },
    { value: 2, label: 'Unpaid' },
    { value: 3, label: 'Partial Paid' },
    { value: 4, label: 'Paid' },
  ]

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
    <>
      <Main>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Invoices</h1>
            <p className='text-muted-foreground'>
              Manage your invoices and billing information
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='default'
              size='sm'
              onClick={() => setIsPostInvoicesModalOpen(true)}
            >
              <Send className='mr-2 h-4 w-4' />
              Post Invoices
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm'>
                  <Filter className='mr-2 h-4 w-4' />
                  Filter by Status
                  {statusFilter.length > 0 && (
                    <Badge variant='secondary' className='ml-2'>
                      {statusFilter.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-48'>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statusOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={statusFilter.includes(option.value)}
                    onCheckedChange={() => handleStatusFilterChange(option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
                {statusFilter.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={clearStatusFilter}
                      className='text-muted-foreground cursor-pointer'
                    >
                      Clear Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant='outline' size='sm'>
              <Download className='mr-2 h-4 w-4' />
              Export
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Invoice List</CardTitle>
                <CardDescription>
                  View and manage all your invoices
                  {pagination.total > 0 && (
                    <span className='ml-2'>
                      ({pagination.from}-{pagination.to} of {pagination.total})
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className='flex items-center gap-2'>
                <div className='relative'>
                  <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                  <Input
                    placeholder='Search invoices...'
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className='pl-8 w-64'
                  />
                </div>
                <Select
                  value={pagination.per_page.toString()}
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                      <TableHead>S/N</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('invoice_number')}
                      >
                        Invoice # {renderSortIcon('invoice_number')}
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('issue_date')}
                      >
                        Issue Date {renderSortIcon('issue_date')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted text-right'
                        onClick={() => handleSort('amount')}
                      >
                        Amount {renderSortIcon('amount')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted text-right'
                        onClick={() => handleSort('due')}
                      >
                        Due {renderSortIcon('due')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('due_date')}
                      >
                        Due Date {renderSortIcon('due_date')}
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice, index) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </TableCell>
                        <TableCell className='font-medium'>
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>{invoice.customer_name}</TableCell>
                        <TableCell>{invoice.issue_date || '-'}</TableCell>
                        <TableCell className='text-right'>
                          {invoice.amount_formatted}
                        </TableCell>
                        <TableCell className='text-right'>
                          {invoice.due_formatted}
                        </TableCell>
                        <TableCell>
                          {invoice.is_overdue ? (
                            <span className='text-destructive'>{invoice.due_date}</span>
                          ) : (
                            invoice.due_date
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status, invoice.is_overdue)}</TableCell>
                        <TableCell className='text-right' onClick={(e) => e.stopPropagation()}>
                          <div className='flex items-center justify-end gap-2'>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                              title='View'
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedInvoiceId(invoice.id)
                                setIsModalOpen(true)
                              }}
                            >
                              <Eye className='h-4 w-4' />
                            </Button>
                          </div>
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
                  Showing {pagination.from} to {pagination.to} of {pagination.total} invoices
                </div>
                <div className='flex items-center gap-2'>
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
                    {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                      let pageNum: number
                      if (pagination.last_page <= 5) {
                        pageNum = i + 1
                      } else if (pagination.current_page <= 3) {
                        pageNum = i + 1
                      } else if (pagination.current_page >= pagination.last_page - 2) {
                        pageNum = pagination.last_page - 4 + i
                      } else {
                        pageNum = pagination.current_page - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.current_page === pageNum ? 'default' : 'outline'}
                          size='sm'
                          onClick={() => handlePageChange(pageNum)}
                          className='w-10'
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
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

      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <PostInvoicesModal
        open={isPostInvoicesModalOpen}
        onOpenChange={setIsPostInvoicesModalOpen}
        onPosted={() => fetchInvoices()}
      />
    </>
  )
}
