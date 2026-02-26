import { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, ArrowLeftRight } from 'lucide-react'
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
import { bankTransferApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AddEditBankTransferModal } from './add-edit-bank-transfer-modal'

export interface BankTransfer {
  id: number
  date: string
  date_raw: string
  from_account_id: number
  from_account_name: string
  to_account_id: number
  to_account_name: string
  amount: number
  amount_formatted: string
  reference: string
  description: string
}

export function BankTransfers() {
  const [transfers, setTransfers] = useState<BankTransfer[]>([])
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
  const [editingTransfer, setEditingTransfer] = useState<BankTransfer | null>(null)
  const [deleteTransferId, setDeleteTransferId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Filters
  const [dateFilter, setDateFilter] = useState('')
  const [fromAccountFilter, setFromAccountFilter] = useState('')
  const [toAccountFilter, setToAccountFilter] = useState('')
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: number; name: string }>>([])

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

  // Fetch bank accounts for filters
  useEffect(() => {
    fetchBankAccounts()
  }, [])

  // Fetch transfers when pagination, sort, search, or filters change
  useEffect(() => {
    fetchTransfers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, sortBy, sortOrder, search, dateFilter, fromAccountFilter, toAccountFilter])

  const fetchBankAccounts = async () => {
    try {
      const accounts = await bankTransferApi.getBankAccounts()
      setBankAccounts(accounts || [])
    } catch (error: any) {
      console.error('Failed to load bank accounts:', error)
      setBankAccounts([])
      // Don't show toast for this as it's not critical
    }
  }

  const fetchTransfers = async (
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
      if (fromAccountFilter) {
        params.from_account = fromAccountFilter
      }
      if (toAccountFilter) {
        params.to_account = toAccountFilter
      }

      const response = await bankTransferApi.getBankTransfers(params)
      setTransfers(response.data || [])
      setPagination(response.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      })
    } catch (error: any) {
      console.error('Error fetching bank transfers:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to load bank transfers')
      setTransfers([])
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

  const handleEdit = (transfer: BankTransfer) => {
    setEditingTransfer(transfer)
    setIsAddModalOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeleteTransferId(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTransferId) return

    try {
      const response = await bankTransferApi.deleteBankTransfer(deleteTransferId)
      if (response.status === 200) {
        toast.success(response.message || 'Bank transfer deleted successfully')
        setIsDeleteDialogOpen(false)
        setDeleteTransferId(null)
        fetchTransfers(1, pagination.per_page, search)
      } else {
        toast.error(response.message || 'Failed to delete bank transfer')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete bank transfer')
    }
  }

  const handleModalClose = () => {
    setIsAddModalOpen(false)
    setEditingTransfer(null)
  }

  const handleModalSuccess = () => {
    fetchTransfers(1, pagination.per_page, search)
  }

  const handleResetFilters = () => {
    setDateFilter('')
    setFromAccountFilter('')
    setToAccountFilter('')
    setSearchInput('')
    setSearch('')
    setPagination((prev) => ({ ...prev, current_page: 1 }))
  }

  return (
    <>
      <Header>
        <div className='flex items-center justify-between w-full'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Bank Transfers</h1>
            <p className='text-muted-foreground'>Manage bank account transfers</p>
          </div>
          <div className='flex items-center gap-2'>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Transfer
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
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              <div>
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
              <div>
                <label className='block text-sm font-medium mb-1'>From Account</label>
                <Select
                  value={fromAccountFilter || 'all'}
                  onValueChange={(value) => {
                    setFromAccountFilter(value === 'all' ? '' : value)
                    setPagination((prev) => ({ ...prev, current_page: 1 }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='All accounts' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All accounts</SelectItem>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className='block text-sm font-medium mb-1'>To Account</label>
                <Select
                  value={toAccountFilter || 'all'}
                  onValueChange={(value) => {
                    setToAccountFilter(value === 'all' ? '' : value)
                    setPagination((prev) => ({ ...prev, current_page: 1 }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='All accounts' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All accounts</SelectItem>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.name}
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
                <CardTitle>Bank Transfers List</CardTitle>
                <CardDescription>
                  View and manage all bank transfers
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
                    placeholder='Search transfers...'
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
            ) : transfers.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                No bank transfers found
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
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('from_account')}
                      >
                        From Account {renderSortIcon('from_account')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('to_account')}
                      >
                        To Account {renderSortIcon('to_account')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted text-right'
                        onClick={() => handleSort('amount')}
                      >
                        Amount {renderSortIcon('amount')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('reference')}
                      >
                        Reference {renderSortIcon('reference')}
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className='text-center'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer, index) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </TableCell>
                        <TableCell>{transfer.date}</TableCell>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <ArrowLeftRight className='h-4 w-4 text-muted-foreground' />
                            {transfer.from_account_name}
                          </div>
                        </TableCell>
                        <TableCell className='font-medium'>{transfer.to_account_name}</TableCell>
                        <TableCell className='text-right'>{transfer.amount_formatted}</TableCell>
                        <TableCell>{transfer.reference || '-'}</TableCell>
                        <TableCell>{transfer.description || '-'}</TableCell>
                        <TableCell className='text-center'>
                          <div className='flex items-center justify-center gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0'
                              onClick={() => handleEdit(transfer)}
                              title='Edit'
                            >
                              <Pencil className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                              onClick={() => handleDelete(transfer.id)}
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
                  Showing {pagination.from} to {pagination.to} of {pagination.total} transfers
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

      <AddEditBankTransferModal
        open={isAddModalOpen}
        onOpenChange={handleModalClose}
        transfer={editingTransfer}
        onSuccess={handleModalSuccess}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bank transfer and reverse the account balances.
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
