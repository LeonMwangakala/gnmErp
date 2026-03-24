import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Pencil, Building2 } from 'lucide-react'
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
import { bankAccountApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AddEditBankAccountModal } from './add-edit-bank-account-modal'

export interface BankAccount {
  id: number
  holder_name: string
  bank_name: string
  account_number: string
  opening_balance: number
  opening_balance_formatted: string
  contact_number: string
  bank_address: string
  currency_id?: number | null
  currency_code?: string | null
  currency_name?: string | null
  currency_symbol?: string | null
}

export function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
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
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)

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

  // Fetch accounts when pagination, sort, or search changes
  useEffect(() => {
    fetchAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, sortBy, sortOrder, search])

  const fetchAccounts = async (
    page?: number,
    perPage?: number,
    searchTerm?: string
  ) => {
    try {
      setIsLoading(true)
      const currentPage = page ?? pagination.current_page
      const currentPerPage = perPage ?? pagination.per_page
      const currentSearch = searchTerm ?? search

      const response = await bankAccountApi.getBankAccounts({
        page: currentPage,
        per_page: currentPerPage,
        search: currentSearch || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setAccounts(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load bank accounts')
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

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setIsAddModalOpen(true)
  }

  const handleModalClose = () => {
    setIsAddModalOpen(false)
    setEditingAccount(null)
  }

  const handleModalSuccess = () => {
    fetchAccounts(1, pagination.per_page, search)
  }

  return (
    <>
      <Header>
        <div className='flex items-center justify-between w-full'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Bank Accounts</h1>
            <p className='text-muted-foreground'>Manage bank accounts</p>
          </div>
          <div className='flex items-center gap-2'>
            <Input
              placeholder='Search accounts...'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className='max-w-sm'
            />
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Account
            </Button>
          </div>
        </div>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts List</CardTitle>
            <CardDescription>
              View and manage all bank accounts
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
            ) : accounts.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                No bank accounts found
              </div>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S/N</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('holder_name')}
                      >
                        Name {renderSortIcon('holder_name')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('bank_name')}
                      >
                        Bank {renderSortIcon('bank_name')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('account_number')}
                      >
                        Account Number {renderSortIcon('account_number')}
                      </TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted text-right'
                        onClick={() => handleSort('opening_balance')}
                      >
                        Current Balance {renderSortIcon('opening_balance')}
                      </TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead
                        className='cursor-pointer hover:bg-muted'
                        onClick={() => handleSort('contact_number')}
                      >
                        Contact Number {renderSortIcon('contact_number')}
                      </TableHead>
                      <TableHead>Bank Branch</TableHead>
                      <TableHead className='text-center'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account, index) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </TableCell>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <Building2 className='h-4 w-4 text-muted-foreground' />
                            {account.holder_name}
                          </div>
                        </TableCell>
                        <TableCell>{account.bank_name}</TableCell>
                        <TableCell>{account.account_number}</TableCell>
                        <TableCell className='text-right'>
                          {account.opening_balance_formatted}
                        </TableCell>
                        <TableCell>
                          {account.currency_code
                            ? `${account.currency_code}`
                            : 'Base'}
                        </TableCell>
                        <TableCell>{account.contact_number}</TableCell>
                        <TableCell>{account.bank_address || '-'}</TableCell>
                        <TableCell className='text-center'>
                          {account.holder_name !== 'Cash' ? (
                            <div className='flex items-center justify-center gap-2'>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 w-8 p-0'
                                onClick={() => handleEdit(account)}
                                title='Edit'
                              >
                                <Pencil className='h-4 w-4' />
                              </Button>
                            </div>
                          ) : (
                            '-'
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
                  Showing {pagination.from} to {pagination.to} of {pagination.total} accounts
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

      <AddEditBankAccountModal
        open={isAddModalOpen}
        onOpenChange={handleModalClose}
        account={editingAccount}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}
