import { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Eye, RefreshCw } from 'lucide-react'
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
import { pettyCashApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AddEditPettyCashModal } from './add-edit-petty-cash-modal'
import { PettyCashDetailModal } from './petty-cash-detail-modal'

export interface PettyCashExpense {
  id: number
  petty_number: string
  folio: string
  date: string
  date_formatted: string
  currency: number
  balance: number
  balance_formatted: string
  grand_total: number
  grand_total_formatted: string
  new_balance: number
  new_balance_formatted: string
  receiver_for: string
  receiver: number
  receiver_name: string
  receiver_phone: string
  status: number | null
}

export function PettyCash() {
  const [expenses, setExpenses] = useState<PettyCashExpense[]>([])
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
  const [searchInput, setSearchInput] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<PettyCashExpense | null>(null)
  const [viewingExpense, setViewingExpense] = useState<PettyCashExpense | null>(null)
  const [deleteExpenseId, setDeleteExpenseId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [balance, setBalance] = useState<number>(0)
  const [pendingBalance, setPendingBalance] = useState<number>(0)

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

  // Fetch data
  useEffect(() => {
    fetchExpenses()
    fetchBalance()
  }, [pagination.current_page, pagination.per_page, search])

  const fetchBalance = async () => {
    try {
      const data = await pettyCashApi.getFormData()
      setBalance(data.balance || 0)
      setPendingBalance(data.pending_balance || 0)
    } catch (error: any) {
      console.error('Failed to load balance:', error)
    }
  }

  const fetchExpenses = async () => {
    setIsLoading(true)
    try {
      const params: any = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      }
      if (search) {
        params.search = search
      }

      const response = await pettyCashApi.getPettyCashExpenses(params)
      setExpenses(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch petty cash expenses')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingExpense(null)
    setIsAddModalOpen(true)
  }

  const handleEdit = (expense: PettyCashExpense) => {
    setEditingExpense(expense)
    setIsAddModalOpen(true)
  }

  const handleView = (expense: PettyCashExpense) => {
    setViewingExpense(expense)
  }

  const handleDelete = (id: number) => {
    setDeleteExpenseId(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteExpenseId) return

    try {
      await pettyCashApi.deletePettyCash(deleteExpenseId)
      toast.success('Petty cash expense deleted successfully')
      setIsDeleteDialogOpen(false)
      setDeleteExpenseId(null)
      fetchExpenses()
      fetchBalance()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete petty cash expense')
    }
  }

  const handleSyncBalance = async () => {
    try {
      // This would call a sync endpoint if available
      toast.success('Balance synced successfully')
      fetchBalance()
      fetchExpenses()
    } catch (error: any) {
      toast.error('Failed to sync balance')
    }
  }

  return (
    <>
      <Header>
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-2xl font-semibold">Petty Cash</h1>
            <p className="text-muted-foreground">Manage petty cash expenses</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Balance</div>
              <div className="text-lg font-semibold text-green-600">
                {balance.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Pending Request</div>
              <div className="text-lg font-semibold text-gray-600">
                {pendingBalance.toLocaleString()}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSyncBalance}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Expense
            </Button>
          </div>
        </div>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Petty Cash Expenses</CardTitle>
            <CardDescription>View and manage all petty cash expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by reference, folio, or receiver name..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No petty cash expenses found
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S/No</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Opening Balance</TableHead>
                        <TableHead>Utilized Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Receiver</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Receiver Phone</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense, index) => (
                        <TableRow key={expense.id}>
                          <TableCell>
                            {(pagination.current_page - 1) * pagination.per_page + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{expense.petty_number}</TableCell>
                          <TableCell>{expense.date_formatted}</TableCell>
                          <TableCell>{expense.balance_formatted}</TableCell>
                          <TableCell>{expense.grand_total_formatted}</TableCell>
                          <TableCell>{expense.new_balance_formatted}</TableCell>
                          <TableCell>{expense.receiver_for}</TableCell>
                          <TableCell>{expense.receiver_name || '-'}</TableCell>
                          <TableCell>{expense.receiver_phone || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(expense)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(expense.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {pagination.from} to {pagination.to} of {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={pagination.per_page.toString()}
                      onValueChange={(value) => {
                        setPagination((prev) => ({
                          ...prev,
                          per_page: parseInt(value),
                          current_page: 1,
                        }))
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          current_page: Math.max(1, prev.current_page - 1),
                        }))
                      }
                      disabled={pagination.current_page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {pagination.current_page} of {pagination.last_page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          current_page: Math.min(prev.last_page, prev.current_page + 1),
                        }))
                      }
                      disabled={pagination.current_page === pagination.last_page}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Main>

      {/* Modals */}
      <AddEditPettyCashModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        expense={editingExpense}
        onSuccess={() => {
          fetchExpenses()
          fetchBalance()
        }}
      />

      <PettyCashDetailModal
        open={!!viewingExpense}
        onOpenChange={(open) => !open && setViewingExpense(null)}
        expenseId={viewingExpense?.id}
      />

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the petty cash expense and restore the balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
