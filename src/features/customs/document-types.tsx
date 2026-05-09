import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CUSTOMS_DOCUMENT_STAGE_CODES,
  customsDocumentTypeApi,
  labelForCustomsDocumentStage,
  type CustomsDocumentStageCode,
  type CustomsDocumentType,
  type PaginationMeta,
} from '@/lib/api'

const emptyPagination: PaginationMeta = {
  current_page: 1,
  per_page: 20,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
}

export function CustomsJobDocumentTypes() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<CustomsDocumentType[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination)
  const [listLoading, setListLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formStage, setFormStage] = useState<CustomsDocumentStageCode>('SHIPPING_LINE')
  const [formSortOrder, setFormSortOrder] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<CustomsDocumentType | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const loadRows = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await customsDocumentTypeApi.list({
        search: search || undefined,
        per_page: 20,
        page,
      })
      setRows(res.data)
      setPagination({
        ...res.pagination,
        from: res.pagination.from ?? null,
        to: res.pagination.to ?? null,
      })
    } catch {
      setRows([])
      setPagination(emptyPagination)
    } finally {
      setListLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const openCreate = () => {
    setModalMode('create')
    setEditingId(null)
    setFormName('')
    setFormStage('SHIPPING_LINE')
    setFormSortOrder('')
    setModalOpen(true)
  }

  const openEdit = (row: CustomsDocumentType) => {
    setModalMode('edit')
    setEditingId(row.id)
    setFormName(row.name)
    setFormStage(row.stage)
    setFormSortOrder(row.sortOrder > 0 ? String(row.sortOrder) : '')
    setModalOpen(true)
  }

  const save = async () => {
    const name = formName.trim()
    if (!name) {
      toast.error('Document name is required')
      return
    }

    let sortPayload: number | undefined
    const soTrim = formSortOrder.trim()
    if (soTrim !== '') {
      const n = Number.parseInt(soTrim, 10)
      if (!Number.isFinite(n) || n < 0 || n > 65535) {
        toast.error('Sort order must be between 0 and 65535')
        return
      }
      sortPayload = n
    }

    const payload =
      sortPayload !== undefined
        ? { name, stage: formStage, sort_order: sortPayload }
        : { name, stage: formStage }

    setSaving(true)
    try {
      if (modalMode === 'create') {
        await customsDocumentTypeApi.create(payload)
        toast.success('Document type added')
      } else if (editingId != null) {
        await customsDocumentTypeApi.update(editingId, payload)
        toast.success('Document type updated')
      }
      setModalOpen(false)
      void loadRows()
    } catch {
      //
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await customsDocumentTypeApi.delete(deleteTarget.id)
      toast.success('Document type deleted')
      setDeleteTarget(null)
      void loadRows()
    } catch {
      //
    } finally {
      setDeleteLoading(false)
    }
  }

  const from = pagination.from ?? 0
  const to = pagination.to ?? 0

  return (
    <CustomsPage
      title='Job document types'
      description='Names and workflow stage (Shipping, Declaration, Port, TBS) for the job Documents upload list.'
    >
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle>Document types</CardTitle>
              <CardDescription>
                Each type maps to a job stage so clerks can pick documents under the right category.
              </CardDescription>
            </div>
            <Button type='button' onClick={openCreate}>
              <Plus className='mr-2 h-4 w-4' />
              Add type
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className='relative mb-4 max-w-md'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              className='pl-8'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Search by name'
            />
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[56px]'>S/N</TableHead>
                  <TableHead className='w-[100px]'>Order</TableHead>
                  <TableHead className='min-w-[120px]'>Stage</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className='w-[120px] text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-8 text-center text-muted-foreground'>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-8 text-center text-muted-foreground'>
                      No document types yet. Add one or run migrations to load defaults.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {(pagination.current_page - 1) * pagination.per_page + index + 1}
                      </TableCell>
                      <TableCell>{row.sortOrder}</TableCell>
                      <TableCell>{labelForCustomsDocumentStage(row.stage)}</TableCell>
                      <TableCell className='font-medium'>{row.name}</TableCell>
                      <TableCell className='text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type='button' variant='outline' size='sm'>
                              Options
                              <ChevronDown className='ml-2 h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-44'>
                            <DropdownMenuLabel>Action</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(row)}>
                              <Pencil className='mr-2 h-4 w-4' />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-destructive focus:text-destructive'
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination.last_page > 1 && (
            <div className='mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground'>
              <span>
                {pagination.total > 0
                  ? `Showing ${from || 1}–${to || rows.length} of ${pagination.total}`
                  : 'No results'}
              </span>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={page <= 1 || listLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={page >= pagination.last_page || listLoading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o)
          if (!o) setEditingId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'Add document type' : 'Edit document type'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='space-y-1'>
              <Label>Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Stage</Label>
              <Select
                value={formStage}
                onValueChange={(v: string) => setFormStage(v as CustomsDocumentStageCode)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMS_DOCUMENT_STAGE_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {labelForCustomsDocumentStage(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                Same categories as the job workflow: Shipping line, Declaration (TRA), Port, TBS.
              </p>
            </div>
            <div className='space-y-1'>
              <Label>Sort order</Label>
              <Input
                type='number'
                min={0}
                max={65535}
                placeholder='Leave blank to append last'
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(e.target.value)}
              />
              <p className='text-xs text-muted-foreground'>
                Lower numbers appear first within each stage on the job upload list. Leave empty when
                adding to use automatic ordering.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type='button' disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document type?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Removes “${deleteTarget.name}” from the list. Files already uploaded under this name on jobs are unchanged.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-red-600 hover:bg-red-700'
              disabled={deleteLoading}
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CustomsPage>
  )
}
