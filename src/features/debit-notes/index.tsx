import { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
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
import { debitNoteApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AddDebitNoteModal } from './add-debit-note-modal'

export interface DebitNote {
  id: number
  bill_id: number | null
  bill_number: string
  vendor_id: number | null
  vendor_name: string
  date: string
  date_raw: string
  amount: number
  amount_formatted: string
  description: string
}

export function DebitNotes() {
  const [debits, setDebits] = useState<DebitNote[]>([])
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
  const [deleteDebitId, setDeleteDebitId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Filters
  const [dateFilter, setDateFilter] = useState('')
  const [billFilter, setBillFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [billOptions, setBillOptions] = useState<Array<{ id: number; label: string }>>([])
  const [vendorOptions, setVendorOptions] = useState<Array<{ id: number; name: string }>>([])

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

  // Fetch form data for filters (reuse debit note form data bills list)
  useEffect(() => {
    fetchFormData()
  }, [])

  // Fetch debit notes when pagination, sort, search, or filters change
  useEffect(() => {
    fetchDebitNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, sortBy, sortOrder, search, dateFilter, billFilter, vendorFilter])

  const fetchFormData = async () => {
    try {
      const data = await debitNoteApi.getFormData()
      const bills = data.bills || []
      setBillOptions(
        bills.map((b: any) => ({
          id: b.id,
          label: `${b.bill_number} - ${b.vendor_name} (Due: ${b.due_formatted})`,
        }))
      )
      const vendorsMap = new Map<number, string>()
      bills.forEach((b: any) => {
        if (b.vendor_id && b.vendor_name) {
          vendorsMap.set(b.vendor_id, b.vendor_name)
        }
      })
      setVendorOptions(Array.from(vendorsMap.entries()).map(([id, name]) => ({ id, name })))
    } catch (error: any) {
      console.error('Failed to load debit note form data:', error)
    }
  }

  const fetchDebitNotes = async (
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
      if (billFilter && billFilter !== 'all') {
        params.bill_id = billFilter
      }
      if (vendorFilter && vendorFilter !== 'all') {
        params.vendor_id = vendorFilter
      }

      const response = await debitNoteApi.getDebitNotes(params)
      setDebits(response.data || [])
      setPagination(response.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      })
    } catch (error: any) {
      console.error('Error fetching debit notes:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to load debit notes')
      setDebits([])
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

  const handleDelete = (id: number) => {
    setDeleteDebitId(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteDebitId) return

    try {
      const response = await debitNoteApi.deleteDebitNote(deleteDebitId)
      if (response.status === 200) {
        toast.success(response.message || 'Debit note deleted successfully')
        setIsDeleteDialogOpen(false)
        setDeleteDebitId(null)
        fetchDebitNotes(1, pagination.per_page, search)
      } else {
        toast.error(response.message || 'Failed to delete debit note')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete debit note')
    }
  }

  const handleModalClose = () => {
    setIsAddModalOpen(false)
  }

  const handleModalSuccess = () => {
    fetchDebitNotes(1, pagination.per_page, search)
  }

  const handleResetFilters = () => {
    setDateFilter('')
    setBillFilter('all')
    setVendorFilter('all')
    setSearchInput('')
    setSearch('')
    setPagination((prev) => ({ ...prev, current_page: 1 }))
  }

  return (
    <>
      <Header>
        <div className='flex items-center justify-between w-full'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Debit Notes</h1>
            <p className='text-muted-foreground'>Manage debit notes for bills</p>
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
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
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
                <label className='block text-sm font-medium mb-1'>Bill</label>
                <Select
                  value={billFilter}
                  onValueChange={(value) => {
                    setBillFilter(value)
                    setPagination((prev) => ({ ...prev, current_page: 1 }))
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='All bills' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All bills</SelectItem>
                    {billOptions.map((bill) => (
                      <SelectItem key={bill.id} value={String(bill.id)}>
                        {bill.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='w-full'>
                <label className='block text-sm font-medium mb-1'>Vendor</label>
                <Select
                  value={vendorFilter}
                  onValueChange={(value) => {
                    setVendorFilter(value)
                    setPagination((prev) => ({ ...prev, current_page: 1 }))
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='All vendors' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All vendors</SelectItem>
                    {vendorOptions.map((vendor) => (
                      <SelectItem key={vendor.id} value={String(vendor.id)}>
                        {vendor.name}
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
                <CardTitle>Debit Note List</CardTitle>
                <CardDescription>
                  View and manage all debit notes
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
                    placeholder='Search debit notes...'
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
            ) : debits.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                No debit notes found
              </div>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S/N</TableHead>
                      <TableHead>Bill</TableHead>
                      <TableHead>Vendor</TableHead>
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
                      <TableHead>Description</TableHead>
                      <TableHead className='text-center'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debits.map((debit, index) => (
                      <TableRow key={debit.id}>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </TableCell>
                        <TableCell>{debit.bill_number}</TableCell>
                        <TableCell>{debit.vendor_name}</TableCell>
                        <TableCell>{debit.date}</TableCell>
                        <TableCell className='text-right font-medium'>
                          {debit.amount_formatted}
                        </TableCell>
                        <TableCell>{debit.description || '-'}</TableCell>
                        <TableCell className='text-center'>
                          <div className='flex items-center justify-center gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                              onClick={() => handleDelete(debit.id)}
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
                  Showing {pagination.from} to {pagination.to} of {pagination.total} debit notes
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

      <AddDebitNoteModal
        open={isAddModalOpen}
        onOpenChange={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the debit note
              and update the vendor balance.
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

