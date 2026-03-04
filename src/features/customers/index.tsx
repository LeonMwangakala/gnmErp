import { useState, useEffect } from 'react'
import { Eye, Download, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { customerApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { CustomerDetailModal } from './customer-detail-modal'

export interface Customer {
  id: number
  customer_number: string
  name: string
  short_name: string
  contact: string
  email: string
  tax_number: string
  vrn: string
  balance: number
  balance_formatted: string
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
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
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchInput, setSearchInput] = useState('')

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
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch customers when pagination, sort, or search changes
  useEffect(() => {
    fetchCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, sortBy, sortOrder, search])

  const fetchCustomers = async (
    page?: number,
    perPage?: number,
    searchTerm?: string
  ) => {
    try {
      setIsLoading(true)
      const currentPage = page ?? pagination.current_page
      const currentPerPage = perPage ?? pagination.per_page
      const currentSearch = searchTerm ?? search

      const response = await customerApi.getCustomers({
        page: currentPage,
        per_page: currentPerPage,
        search: currentSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setCustomers(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load customers')
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

  return (
    <>
      <Main>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Customers</h1>
            <p className='text-muted-foreground'>
              Manage your customers and their information
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm'>
              <RefreshCw className='mr-2 h-4 w-4' />
              Synchronize
            </Button>
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
                <CardTitle>Customer List</CardTitle>
                <CardDescription>
                  View and manage all your customers
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
                    placeholder='Search customers...'
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className='pl-8 w-64'
                  />
                </div>
                <Select
                  value={pagination.per_page.toString()}
                  onValueChange={(value) => handlePerPageChange(Number(value))}
                >
                  <SelectTrigger className='w-32'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='10'>10 per page</SelectItem>
                    <SelectItem value='15'>15 per page</SelectItem>
                    <SelectItem value='25'>25 per page</SelectItem>
                    <SelectItem value='50'>50 per page</SelectItem>
                    <SelectItem value='100'>100 per page</SelectItem>
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
            ) : customers.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                No customers found
              </div>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S/N</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('customer_number')}
                      >
                        Customer Number
                        {sortBy === 'customer_number' && (
                          <span className='ml-1'>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('name')}
                      >
                        Customer Name
                        {sortBy === 'name' && (
                          <span className='ml-1'>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                      <TableHead>Short Name</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('email')}
                      >
                        Email
                        {sortBy === 'email' && (
                          <span className='ml-1'>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                      <TableHead>TIN</TableHead>
                      <TableHead>VRN</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('balance')}
                      >
                        Balance
                        {sortBy === 'balance' && (
                          <span className='ml-1'>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </TableHead>
                      <TableHead className='text-right'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer, index) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </TableCell>
                        <TableCell className='font-medium'>
                          {customer.customer_number}
                        </TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.short_name}</TableCell>
                        <TableCell>{customer.contact}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.tax_number || '-'}</TableCell>
                        <TableCell>{customer.vrn || '-'}</TableCell>
                        <TableCell>{customer.balance_formatted}</TableCell>
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
                                setSelectedCustomerId(customer.id)
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
                  Showing {pagination.from} to {pagination.to} of {pagination.total} customers
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

      <CustomerDetailModal
        customerId={selectedCustomerId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  )
}
