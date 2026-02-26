import { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, DollarSign, Download, Eye } from 'lucide-react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { expensePaymentApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AddEditExpensePaymentModal } from './add-edit-expense-payment-modal'

export interface ExpensePayment {
  id: number
  date: string
  date_raw: string
  amount: number
  amount_formatted: string
  account_id: number
  account_name: string
  vender_id: number | null
  vender_name: string
  category_id: number
  category_name: string
  reference: string
  description: string
  add_receipt: string | null
  receipt_url: string | null
}

export function ExpensePayments() {
  const [payments, setPayments] = useState<ExpensePayment[]>([])
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
  const [editingPayment, setEditingPayment] = useState<ExpensePayment | null>(null)
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Filters
  const [dateFilter, setDateFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [venderFilter, setVenderFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>([])
  const [vendors, setVendors] = useState<Array<{ id: number; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])

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

  // Fetch form data for filters
  useEffect(() => {
    fetchFormData()
  }, [])

  // Fetch payments when pagination, sort, search, or filters change
  useEffect(() => {
    fetchPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, sortBy, sortOrder, search, dateFilter, accountFilter, venderFilter, categoryFilter])

  const fetchFormData = async () => {
    try {
      const data = await expensePaymentApi.getFormData()
      setAccounts(data.accounts || [])
      setVendors(data.vendors || [])
      setCategories(data.categories || [])
    } catch (error: any) {
      console.error('Failed to load form data:', error)
    }
  }

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

      const params: any = {
        page: currentPage,
        per_page: currentPerPage,
        search: currentSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }

      if (dateFilter) {
        params.date = dateFilter
      }
      if (accountFilter && accountFilter !== 'all') {
        params.account_id = accountFilter
      }
      if (venderFilter && venderFilter !== 'all') {
        params.vender_id = venderFilter
      }
      if (categoryFilter && categoryFilter !== 'all') {
        params.category_id = categoryFilter
      }

      const response = await expensePaymentApi.getExpensePayments(params)
      setPayments(response.data || [])
      setPagination(response.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      })
    } catch (error: any) {
      console.error('Error fetching payments:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to load payments')
      setPayments([])
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

  const handleEdit = (payment: ExpensePayment) => {
    setEditingPayment(payment)
    setIsAddModalOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeletePaymentId(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletePaymentId) return

    try {
      const response = await expensePaymentApi.deleteExpensePayment(deletePaymentId)
      if (response.status === 200) {
        toast.success(response.message || 'Payment deleted successfully')
        setIsDeleteDialogOpen(false)
        setDeletePaymentId(null)
        fetchPayments(1, pagination.per_page, search)
      } else {
        toast.error(response.message || 'Failed to delete payment')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete payment')
    }
  }

  const handleModalClose = () => {
    setIsAddModalOpen(false)
    setEditingPayment(null)
  }

  const handleModalSuccess = () => {
    fetchPayments(1, pagination.per_page, search)
  }

  const handleResetFilters = () => {
    setDateFilter('')
    setAccountFilter('all')
    setVenderFilter('all')
    setCategoryFilter('all')
    setSearchInput('')
    setSearch('')
    setPagination((prev) => ({ ...prev, current_page: 1 }))
  }

  return (
    <>
      <Header>
        <div className='flex items-center justify-between w-full'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Payments</h1>
            <p className='text-muted-foreground'>Manage expense payments</p>
          </div>
          <div className='flex items-center gap-2'>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Create
            </Button>
          </div>
        </div>
      </Header>

      <Main>
        {/* Filters */}
        <Card className='mb-4'>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
              <div className='w-full'>
                <label className='block text-sm font-medium mb-1'>Date Range</label>
                <Input
                  type='text'
                  placeholder='YYYY-MM-DD to YYYY-MM-DD'
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value)
                    setPagination((prev) => ({ ...prev, current_page: 1 }))
                  }}
                />
              </div>
              <div className='w-full'>
                <label className='block text-sm font-medium mb-1'>Account</label>
                <Select
                  value={accountFilter}
                  onValueChange={(value) => {
                    setAccountFilter(value)
                    setPagination((prev) => ({ ...prev, current_page: 1 }))
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='All accounts' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='w-full'>
                <label className='block text-sm font-medium mb-1'>Vendor</label>
                <Select
                  value={venderFilter}
                  onValueChange={(value) => {
                    setVenderFilter(value)
                    setPagination((prev) => ({ ...prev, current_page: 1 }))
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='All vendors' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All vendors</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={String(vendor.id)}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='w-full'>
                <label className='block text-sm font-medium mb-1'>Category</label>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(value)
                    setPagination((prev) => ({ ...prev, current_page: 1 }))
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='All categories' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-end gap-2'>
                <Button variant='outline' onClick={handleResetFilters} className='w-full'>
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Payment List</CardTitle>
                <CardDescription>
                  View and manage all expense payments
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
                    placeholder='Search payments...'
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
            ) : payments.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                No payment records found
              </div>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S/N</TableHead>
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
                      <TableHead>Account</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead className='text-center'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </TableCell>
                        <TableCell>{payment.date}</TableCell>
                        <TableCell className='text-right font-medium'>
                          <div className='flex items-center justify-end gap-1'>
                            <DollarSign className='h-4 w-4 text-muted-foreground' />
                            {payment.amount_formatted}
                          </div>
                        </TableCell>
                        <TableCell>{payment.account_name}</TableCell>
                        <TableCell>{payment.vender_name}</TableCell>
                        <TableCell>{payment.category_name}</TableCell>
                        <TableCell>{payment.reference || '-'}</TableCell>
                        <TableCell>{payment.description || '-'}</TableCell>
                        <TableCell>
                          {payment.receipt_url ? (
                            <div className='flex items-center gap-2'>
                              <a
                                href={payment.receipt_url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-primary hover:underline flex items-center gap-1'
                                title='View'
                              >
                                <Eye className='h-4 w-4' />
                              </a>
                              <a
                                href={payment.receipt_url}
                                download
                                className='text-primary hover:underline flex items-center gap-1'
                                title='Download'
                              >
                                <Download className='h-4 w-4' />
                              </a>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className='text-center'>
                          <div className='flex items-center justify-center gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                              onClick={() => handleEdit(payment)}
                              title='Edit'
                            >
                              <Pencil className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                              onClick={() => handleDelete(payment.id)}
                              title='Delete'
                            >
                              <Trash2 className='h-4 w-4' />
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
                  Showing {pagination.from} to {pagination.to} of {pagination.total} payments
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

      <AddEditExpensePaymentModal
        open={isAddModalOpen}
        onOpenChange={handleModalClose}
        payment={editingPayment}
        onSuccess={handleModalSuccess}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the payment record and reverse the account balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
