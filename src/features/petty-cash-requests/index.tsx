import { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Eye, Check, X } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { pettyCashRequestApi, PaginationMeta } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AddEditPettyCashRequestModal } from './add-edit-petty-cash-request-modal'
import { PettyCashRequestDetailModal } from './petty-cash-request-detail-modal'
import { ApproveRejectPettyCashRequestModal } from './approve-reject-petty-cash-request-modal'

export interface PettyCashRequest {
  id: number
  request_number: string
  amount: number
  amount_formatted: string
  comment: string
  request_user_id: number
  request_user_name: string
  requested_on: string
  requested_on_formatted: string
  status: number | null
  status_text: string
  approved_amount: number | null
  approved_amount_formatted: string | null
  approved_by: number | null
  approved_by_name: string
  approved_on: string | null
  approved_on_formatted: string | null
  approved_comment: string | null
  from_bank_account: number | null
}

export function PettyCashRequests() {
  const [requests, setRequests] = useState<PettyCashRequest[]>([])
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
  const [editingRequest, setEditingRequest] = useState<PettyCashRequest | null>(null)
  const [viewingRequest, setViewingRequest] = useState<PettyCashRequest | null>(null)
  const [approvingRequest, setApprovingRequest] = useState<PettyCashRequest | null>(null)
  const [approveStatus, setApproveStatus] = useState<2 | 3 | null>(null)
  const [deleteRequestId, setDeleteRequestId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
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

  // Fetch data
  useEffect(() => {
    fetchRequests()
  }, [pagination.current_page, pagination.per_page, search, statusFilter])

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const params: any = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      }
      if (search) {
        params.search = search
      }
      if (statusFilter !== 'all') {
        // Send 'pending' for null status in database, or the numeric status value
        params.status = statusFilter
      }

      const response = await pettyCashRequestApi.getPettyCashRequests(params)
      setRequests(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch petty cash requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRequest(null)
    setIsAddModalOpen(true)
  }

  const handleEdit = (request: PettyCashRequest) => {
    setEditingRequest(request)
    setIsAddModalOpen(true)
  }

  const handleView = (request: PettyCashRequest) => {
    setViewingRequest(request)
  }

  const handleApprove = (request: PettyCashRequest) => {
    setApprovingRequest(request)
    setApproveStatus(3)
  }

  const handleReject = (request: PettyCashRequest) => {
    setApprovingRequest(request)
    setApproveStatus(2)
  }

  const handleDelete = (id: number) => {
    setDeleteRequestId(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteRequestId) return

    try {
      await pettyCashRequestApi.deletePettyCashRequest(deleteRequestId)
      toast.success('Petty cash request deleted successfully')
      setIsDeleteDialogOpen(false)
      setDeleteRequestId(null)
      fetchRequests()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete petty cash request')
    }
  }

  const getStatusBadge = (status: number | null) => {
    if (status === 3) {
      return <Badge className="bg-green-500">Approved</Badge>
    } else if (status === 2) {
      return <Badge className="bg-red-500">Rejected</Badge>
    } else {
      return <Badge className="bg-yellow-500">Pending</Badge>
    }
  }

  const canEdit = (request: PettyCashRequest) => {
    return request.status !== 3 && request.status !== 2
  }

  const canApprove = (request: PettyCashRequest) => {
    return request.status !== 2 && request.status !== 3
  }

  return (
    <>
      <Header>
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-2xl font-semibold">Petty Cash Requests</h1>
            <p className="text-muted-foreground">Manage petty cash requests</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </div>
      </Header>

      <Main>
        <Card>
          <CardHeader>
            <CardTitle>Petty Cash Requests</CardTitle>
            <CardDescription>View and manage all petty cash requests</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by request number or comment..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="w-full md:w-[200px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="3">Approved</SelectItem>
                    <SelectItem value="2">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No petty cash requests found
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S/N</TableHead>
                        <TableHead>Request Number</TableHead>
                        <TableHead>Requested Amount</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Requested On</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approved Amount</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead>Approved On</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request, index) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {(pagination.current_page - 1) * pagination.per_page + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{request.request_number}</TableCell>
                          <TableCell>{request.amount_formatted}</TableCell>
                          <TableCell>{request.request_user_name}</TableCell>
                          <TableCell>{request.requested_on_formatted}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>{request.approved_amount_formatted || '-'}</TableCell>
                          <TableCell>{request.approved_by_name || '-'}</TableCell>
                          <TableCell>{request.approved_on_formatted || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(request)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canApprove(request) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleApprove(request)}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReject(request)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {canEdit(request) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(request)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(request.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
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
      <AddEditPettyCashRequestModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        request={editingRequest}
        onSuccess={fetchRequests}
      />

      <PettyCashRequestDetailModal
        open={!!viewingRequest}
        onOpenChange={(open) => !open && setViewingRequest(null)}
        request={viewingRequest}
      />

      <ApproveRejectPettyCashRequestModal
        open={!!approvingRequest && !!approveStatus}
        onOpenChange={(open) => {
          if (!open) {
            setApprovingRequest(null)
            setApproveStatus(null)
          }
        }}
        request={approvingRequest}
        status={approveStatus}
        onSuccess={fetchRequests}
      />

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the petty cash request.
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
