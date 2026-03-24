import { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Eye, Download, Plus } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { billApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { BillDetailModal } from './bill-detail-modal'
import { AddBillModal } from './add-bill-modal'

export interface Bill {
  id: number
  bill_id: string
  bill_number: string
  vender_id: number
  vender_name: string
  category_id: number
  category_name: string
  bill_date: string
  bill_date_raw: string
  due_date: string
  due_date_raw: string
  is_overdue: boolean
  status: number
  status_label: string
  order_number: string
  total: number
  total_formatted: string
  due: number
  due_formatted: string
}

const statusColors: Record<number, string> = {
  0: 'bg-secondary',
  1: 'bg-yellow-500',
  2: 'bg-destructive',
  3: 'bg-blue-500',
  4: 'bg-green-500',
}

export function Bills() {
  const [bills, setBills] = useState<Bill[]>([])
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
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')

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

  // Fetch bills when pagination, sort, search, or filters change
  useEffect(() => {
    fetchBills()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, pagination.per_page, sortBy, sortOrder, search, statusFilter])

  const fetchBills = async (
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

      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter
      }

      const response = await billApi.getBills(params)
      setBills(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load bills')
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
      setSortOrder('desc')
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  const getStatusBadge = (status: number) => {
    const statusLabels: Record<number, string> = {
      0: 'Draft',
      1: 'Sent',
      2: 'Unpaid',
      3: 'Partially Paid',
      4: 'Paid',
    }

    const label = statusLabels[status] || 'Unknown'
    const color = statusColors[status] || 'bg-gray-500'

    return (
      <Badge className={color} variant="default">
        {label}
      </Badge>
    )
  }

  return (
    <>
      <Header>
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-2xl font-semibold">Bills</h1>
            <p className="text-muted-foreground">Manage your bills</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={async () => {
                try {
                  const response = await billApi.exportBills()
                  if (response.status === 200 || response.status === 'ok') {
                    toast.success(response.message || 'Export started. Please wait.')
                  } else {
                    toast.error(response.message || 'Failed to start export.')
                  }
                } catch (error: any) {
                  toast.error(error.response?.data?.message || 'Failed to start export.')
                }
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>
        </div>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Bills</CardTitle>
            <CardDescription>View and manage all bills</CardDescription>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search bills..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="0">Draft</SelectItem>
                    <SelectItem value="1">Sent</SelectItem>
                    <SelectItem value="2">Unpaid</SelectItem>
                    <SelectItem value="3">Partially Paid</SelectItem>
                    <SelectItem value="4">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Select
                  value={String(pagination.per_page)}
                  onValueChange={(value) => handlePerPageChange(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : bills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bills found.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S/N</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort('bill_id')}
                      >
                        Bill # {renderSortIcon('bill_id')}
                      </TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort('bill_date')}
                      >
                        Bill Date {renderSortIcon('bill_date')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort('due_date')}
                      >
                        Due Date {renderSortIcon('due_date')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted text-right"
                        onClick={() => handleSort('total')}
                      >
                        Total {renderSortIcon('total')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted text-right"
                        onClick={() => handleSort('due')}
                      >
                        Due {renderSortIcon('due')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort('status')}
                      >
                        Status {renderSortIcon('status')}
                      </TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill, index) => (
                      <TableRow key={bill.id}>
                        <TableCell>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {bill.bill_number}
                        </TableCell>
                        <TableCell>{bill.vender_name}</TableCell>
                        <TableCell>{bill.category_name}</TableCell>
                        <TableCell>{bill.bill_date}</TableCell>
                        <TableCell>
                          {bill.is_overdue ? (
                            <span className="text-destructive">{bill.due_date}</span>
                          ) : (
                            bill.due_date
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {bill.total_formatted}
                        </TableCell>
                        <TableCell className="text-right">
                          {bill.due_formatted}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(bill.status)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="View"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedBillId(bill.id)
                                setIsModalOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
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
            {!isLoading && bills.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {pagination.from} to {pagination.to} of {pagination.total} bills
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {pagination.current_page} of {pagination.last_page}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>

      <BillDetailModal
        billId={selectedBillId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
      <AddBillModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          // Reload bills from first page after creating
          setPagination((prev) => ({ ...prev, current_page: 1 }))
          fetchBills(1, pagination.per_page, search)
        }}
      />
    </>
  )
}
