import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import { IcdFormModal } from './icd-form-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { customsIcdApi, type CustomsIcd, type PaginationMeta } from '@/lib/api'

const emptyPagination: PaginationMeta = {
  current_page: 1,
  per_page: 20,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
}

type IcdDialogState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; id: number }
  | { kind: 'view'; id: number }

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function CustomsIcdLocations() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<CustomsIcd[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination)
  const [listLoading, setListLoading] = useState(false)

  const [dialog, setDialog] = useState<IcdDialogState>({ kind: 'closed' })
  const [deleteTarget, setDeleteTarget] = useState<CustomsIcd | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const loadIcDs = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await customsIcdApi.list({
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
    void loadIcDs()
  }, [loadIcDs])

  const dialogIcdId = dialog.kind === 'edit' || dialog.kind === 'view' ? dialog.id : null
  const dialogViewOnly = dialog.kind === 'view'
  const dialogOpen = dialog.kind !== 'closed'

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await customsIcdApi.delete(deleteTarget.id)
      toast.success('ICD location deleted')
      setDeleteTarget(null)
      void loadIcDs()
    } catch {
      // interceptor may toast
    } finally {
      setDeleteLoading(false)
    }
  }

  const from = pagination.from ?? 0
  const to = pagination.to ?? 0

  return (
    <CustomsPage
      title='ICD locations'
      description='Maintain ICD names used when clearing jobs (Line/Vessel → ICD transfer location).'
    >
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle>ICD locations</CardTitle>
              <CardDescription>Unique ICD names available on customs jobs</CardDescription>
            </div>
            <Button type='button' onClick={() => setDialog({ kind: 'create' })}>
              <Plus className='mr-2 h-4 w-4' />
              Add ICD
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
              placeholder='Search by name or description'
            />
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[56px]'>S/N</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className='min-w-[200px]'>Description</TableHead>
                  <TableHead className='w-[120px] text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                      No ICD locations yet. Add one to use it on jobs.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {(pagination.current_page - 1) * pagination.per_page + index + 1}
                      </TableCell>
                      <TableCell className='font-medium'>{row.name}</TableCell>
                      <TableCell className='max-w-md text-muted-foreground'>
                        {row.description ? truncate(row.description, 120) : '—'}
                      </TableCell>
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
                            <DropdownMenuItem onClick={() => setDialog({ kind: 'view', id: row.id })}>
                              <Eye className='mr-2 h-4 w-4' />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDialog({ kind: 'edit', id: row.id })}>
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

      <IcdFormModal
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: 'closed' })
        }}
        icdId={dialogIcdId}
        viewOnly={dialogViewOnly}
        onSaved={() => void loadIcDs()}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ICD location?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will remove “${deleteTarget.name}”. Existing jobs keep their saved location text.`
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
