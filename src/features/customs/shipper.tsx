import { useCallback, useEffect, useState } from 'react'
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import { type Shipper } from './shippers-storage'
import { ShipperFormModal } from './shipper-form-modal'
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
import { customsShipperApi, type PaginationMeta } from '@/lib/api'
import { useHoverDropdownDelay } from '@/hooks/use-hover-dropdown'

const emptyPagination: PaginationMeta = {
  current_page: 1,
  per_page: 20,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
}

type ShipperDialogState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; id: number }
  | { kind: 'view'; id: number }

export function CustomsShipper() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination)
  const [listLoading, setListLoading] = useState(false)

  const [dialog, setDialog] = useState<ShipperDialogState>({ kind: 'closed' })
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const hoverMenu = useHoverDropdownDelay()

  const [deleteTarget, setDeleteTarget] = useState<Shipper | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const loadShippers = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await customsShipperApi.list({
        search: search || undefined,
        per_page: 20,
        page,
      })
      setShippers(res.data)
      setPagination({
        ...res.pagination,
        from: res.pagination.from ?? null,
        to: res.pagination.to ?? null,
      })
    } catch {
      setShippers([])
      setPagination(emptyPagination)
    } finally {
      setListLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    void loadShippers()
  }, [loadShippers])

  const openCreate = () => {
    setDialog({ kind: 'create' })
  }

  const openEdit = (row: Shipper) => {
    setDialog({ kind: 'edit', id: row.id })
  }

  const openView = (row: Shipper) => {
    setDialog({ kind: 'view', id: row.id })
  }

  const handleSaved = () => {
    void loadShippers()
  }

  const dialogShipperId =
    dialog.kind === 'edit' || dialog.kind === 'view' ? dialog.id : null
  const dialogViewOnly = dialog.kind === 'view'
  const dialogOpen = dialog.kind !== 'closed'

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await customsShipperApi.delete(deleteTarget.id)
      toast.success('Shipper deleted')
      setDeleteTarget(null)
      void loadShippers()
    } catch {
      // 422 / errors handled by interceptor
    } finally {
      setDeleteLoading(false)
    }
  }

  const from = pagination.from ?? 0
  const to = pagination.to ?? 0

  return (
    <CustomsPage title='Shipper' description='Manage shipper records for customs jobs.'>
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle>Shippers</CardTitle>
              <CardDescription>List of all shipper contacts and addresses</CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className='mr-2 h-4 w-4' />
              Add Shipper
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
              placeholder='Search by name, city, country, contact, phone, email'
            />
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[56px]'>S/N</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tel.</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className='min-w-[120px] text-right whitespace-nowrap'>Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className='py-8 text-center text-muted-foreground'>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : shippers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='py-8 text-center text-muted-foreground'>
                      No shippers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  shippers.map((shipper, index) => (
                    <TableRow key={shipper.id}>
                      <TableCell>
                        {(pagination.current_page - 1) * pagination.per_page + index + 1}
                      </TableCell>
                      <TableCell className='font-medium'>{shipper.name}</TableCell>
                      <TableCell>{shipper.country || '-'}</TableCell>
                      <TableCell>{shipper.city || '-'}</TableCell>
                      <TableCell>{shipper.contactName || '-'}</TableCell>
                      <TableCell>{shipper.telNo || '-'}</TableCell>
                      <TableCell>{shipper.email || shipper.contactEmail || '-'}</TableCell>
                      <TableCell className='text-right'>
                        <div
                          className='inline-flex justify-end'
                          onPointerEnter={() => {
                            hoverMenu.cancel()
                            setMenuOpenId(shipper.id)
                          }}
                          onPointerLeave={() => {
                            hoverMenu.schedule(() => setMenuOpenId(null))
                          }}
                        >
                          <DropdownMenu
                            open={menuOpenId === shipper.id}
                            onOpenChange={(open) => {
                              if (open) {
                                hoverMenu.cancel()
                                setMenuOpenId(shipper.id)
                              } else {
                                setMenuOpenId(null)
                              }
                            }}
                            modal={false}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button type='button' variant='outline' size='sm' className='h-8 px-3'>
                                Options
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align='end'
                              onPointerEnter={hoverMenu.cancel}
                              onPointerLeave={() => hoverMenu.schedule(() => setMenuOpenId(null))}
                              onCloseAutoFocus={(e) => e.preventDefault()}
                            >
                              <DropdownMenuItem
                                onSelect={() => {
                                  setMenuOpenId(null)
                                  openView(shipper)
                                }}
                              >
                                <Eye className='mr-2 h-4 w-4' />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setMenuOpenId(null)
                                  openEdit(shipper)
                                }}
                              >
                                <Pencil className='mr-2 h-4 w-4' />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className='text-destructive focus:text-destructive'
                                onSelect={() => {
                                  setMenuOpenId(null)
                                  setDeleteTarget(shipper)
                                }}
                              >
                                <Trash2 className='mr-2 h-4 w-4' />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
                  ? `Showing ${from || 1}–${to || shippers.length} of ${pagination.total}`
                  : 'No results'}
              </span>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page <= 1 || listLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
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

      <ShipperFormModal
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: 'closed' })
        }}
        shipperId={dialogShipperId}
        viewOnly={dialogViewOnly}
        onSaved={handleSaved}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shipper?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove “${deleteTarget.name}”. You cannot delete a shipper that is used on a job or linked to a vessel.`
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
