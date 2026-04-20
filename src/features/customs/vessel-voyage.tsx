import { useEffect, useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { ChevronDown, Eye, MapPinned, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import { getStoredVessels } from './vessels-storage'
import {
  getStoredVesselVoyages,
  prependStoredVesselVoyage,
  saveStoredVesselVoyages,
  type VesselVoyage,
} from './vessel-voyage-storage'
import { customsVesselVoyageApi } from '@/lib/api'
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
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const vesselVoyageRoute = getRouteApi('/customs/vessel-voyage')

type VesselOption = { id: number; vesselName: string }
type VesselVoyageForm = Omit<VesselVoyage, 'id' | 'createdAt'>
type VoyageFormMode = 'create' | 'edit' | 'view'

const PORT_OPERATOR_OPTIONS = ['TPA', 'TICTS', 'ZPC', 'OTHER'] as const

const initialForm: VesselVoyageForm = {
  status: 'ACTIVE',
  vesselId: null,
  vesselName: '',
  voyage: '',
  arrivalDate: '',
  berthingDate: '',
  carryingDate: '',
  documentDeadline: '',
  paymentCutOff: '',
  manifestReadyTraDate: '',
  manifestReadyInvoiceDate: '',
  portOperator: '',
}

export function CustomsVesselVoyage() {
  const { vesselId: trackVesselId } = vesselVoyageRoute.useSearch()
  const navigate = vesselVoyageRoute.useNavigate()
  const [search, setSearch] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [voyages, setVoyages] = useState<VesselVoyage[]>([])
  const [vessels, setVessels] = useState<VesselOption[]>([])
  const [form, setForm] = useState<VesselVoyageForm>(initialForm)
  const [formMode, setFormMode] = useState<VoyageFormMode>('create')
  const [editingVoyageId, setEditingVoyageId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VesselVoyage | null>(null)
  const isViewMode = formMode === 'view'

  useEffect(() => {
    customsVesselVoyageApi
      .list()
      .then((data) => {
        setVoyages(data)
      })
      .catch(() => {
        setVoyages(getStoredVesselVoyages())
      })

    setVessels(
      getStoredVessels().map((v) => ({
        id: v.id,
        vesselName: v.vesselName,
      }))
    )
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = voyages
    if (q) {
      rows = rows.filter(
        (row) =>
          row.vesselName.toLowerCase().includes(q) ||
          row.voyage.toLowerCase().includes(q) ||
          row.status.toLowerCase().includes(q)
      )
    }
    if (trackVesselId != null) {
      rows = rows.filter((row) => row.vesselId === trackVesselId)
    }
    return rows
  }, [search, voyages, trackVesselId])

  const handleSubmitVoyage = async () => {
    if (!form.vesselId || !form.vesselName.trim()) {
      toast.error('Vessel is required')
      return
    }
    if (!form.voyage.trim()) {
      toast.error('Voyage is required')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        vesselId: form.vesselId,
        voyage: form.voyage,
        arrivalDate: form.arrivalDate || null,
        berthingDate: form.berthingDate || null,
        carryingDate: form.carryingDate || null,
        documentDeadline: form.documentDeadline || null,
        paymentCutOff: form.paymentCutOff || null,
        manifestReadyTraDate: form.manifestReadyTraDate || null,
        manifestReadyInvoiceDate: form.manifestReadyInvoiceDate || null,
        portOperator: form.portOperator || null,
        status: form.status,
      }

      if (editingVoyageId) {
        const updated = await customsVesselVoyageApi.update(editingVoyageId, payload)
        setVoyages((prev) => {
          const next = prev.map((item) => (item.id === updated.id ? updated : item))
          saveStoredVesselVoyages(next)
          return next
        })
        toast.success('Vessel voyage updated')
      } else {
        const created = await customsVesselVoyageApi.create(payload)
        prependStoredVesselVoyage(created)
        setVoyages((prev) => [created, ...prev])
        toast.success('Vessel voyage added')
      }

      setForm(initialForm)
      setEditingVoyageId(null)
      setIsAddOpen(false)
    } catch {
      // interceptor toast
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditVoyage = (row: VesselVoyage) => {
    setFormMode('edit')
    setEditingVoyageId(row.id)
    setForm({
      status: row.status,
      vesselId: row.vesselId,
      vesselName: row.vesselName,
      voyage: row.voyage,
      arrivalDate: row.arrivalDate,
      berthingDate: row.berthingDate,
      carryingDate: row.carryingDate,
      documentDeadline: row.documentDeadline,
      paymentCutOff: row.paymentCutOff,
      manifestReadyTraDate: row.manifestReadyTraDate,
      manifestReadyInvoiceDate: row.manifestReadyInvoiceDate,
      portOperator: row.portOperator,
    })
    setIsAddOpen(true)
  }

  const openViewVoyage = (row: VesselVoyage) => {
    setFormMode('view')
    setEditingVoyageId(row.id)
    setForm({
      status: row.status,
      vesselId: row.vesselId,
      vesselName: row.vesselName,
      voyage: row.voyage,
      arrivalDate: row.arrivalDate,
      berthingDate: row.berthingDate,
      carryingDate: row.carryingDate,
      documentDeadline: row.documentDeadline,
      paymentCutOff: row.paymentCutOff,
      manifestReadyTraDate: row.manifestReadyTraDate,
      manifestReadyInvoiceDate: row.manifestReadyInvoiceDate,
      portOperator: row.portOperator,
    })
    setIsAddOpen(true)
  }

  const handleDeleteVoyage = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await customsVesselVoyageApi.delete(deleteTarget.id)
      setVoyages((prev) => {
        const next = prev.filter((row) => row.id !== deleteTarget.id)
        saveStoredVesselVoyages(next)
        return next
      })
      setDeleteTarget(null)
      toast.success('Vessel voyage deleted')
    } catch {
      // interceptor toast
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <CustomsPage
      title='Vessel Voyage'
      description='Track voyage schedules and assignments for customs jobs.'
    >
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle>Vessel Voyages</CardTitle>
              <CardDescription>List of vessel voyage records</CardDescription>
            </div>
            <Button
              onClick={() => {
                setFormMode('create')
                setEditingVoyageId(null)
                setForm(initialForm)
                setIsAddOpen(true)
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              Add Vessel Voyage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='relative mb-4 max-w-md'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              className='pl-8'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search by vessel or voyage'
            />
          </div>

          {trackVesselId != null ? (
            <div className='mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/25 bg-muted/50 px-3 py-2 text-sm'>
              <span>
                Showing voyages for vessel ID <span className='font-medium'>{trackVesselId}</span>{' '}
                only.
              </span>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  navigate({
                    to: '/customs/vessel-voyage',
                    search: {},
                  })
                }
              >
                Show all voyages
              </Button>
            </div>
          ) : null}

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>Vessel</TableHead>
                  <TableHead>Voyage</TableHead>
                  <TableHead>Arrival Date</TableHead>
                  <TableHead>Berthing Date</TableHead>
                  <TableHead>Carrying Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='py-8 text-center text-muted-foreground'>
                      No vessel voyages yet. Click "Add Vessel Voyage" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className='font-medium'>{row.vesselName}</TableCell>
                      <TableCell>{row.voyage}</TableCell>
                      <TableCell>{row.arrivalDate || '-'}</TableCell>
                      <TableCell>{row.berthingDate || '-'}</TableCell>
                      <TableCell>{row.carryingDate || '-'}</TableCell>
                      <TableCell>
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
                            <DropdownMenuItem onClick={() => openViewVoyage(row)}>
                              <Eye className='mr-2 h-4 w-4' />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditVoyage(row)}>
                              <Pencil className='mr-2 h-4 w-4' />
                              Update
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(row)}
                              className='text-destructive focus:text-destructive'
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Delete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate({
                                  to: '/customs/vessel-voyage',
                                  search: row.vesselId ? { vesselId: row.vesselId } : {},
                                })
                              }
                            >
                              <MapPinned className='mr-2 h-4 w-4' />
                              Track
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
        </CardContent>
      </Card>

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (isSubmitting) return
          if (!open) {
            setFormMode('create')
            setEditingVoyageId(null)
            setForm(initialForm)
          }
          setIsAddOpen(open)
        }}
      >
        <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] overflow-y-auto sm:max-w-[1200px]!'>
          <DialogHeader>
            <DialogTitle>
              {formMode === 'view'
                ? 'View Vessel Voyage'
                : editingVoyageId
                  ? 'Update Vessel Voyage'
                  : 'Vessel Voyage'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'view'
                ? 'Voyage details in read-only mode.'
                : editingVoyageId
                ? 'Update the voyage details and save changes.'
                : 'Create a new vessel voyage record.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
            <div className='space-y-1 md:col-span-2'>
              <Label>Vessel</Label>
              <Select
                value={form.vesselId ? String(form.vesselId) : '__empty__'}
                disabled={isViewMode}
                onValueChange={(v) => {
                  if (v === '__empty__') {
                    setForm((p) => ({ ...p, vesselId: null, vesselName: '' }))
                    return
                  }
                  const vesselId = Number(v)
                  const vesselName =
                    vessels.find((item) => item.id === vesselId)?.vesselName || ''
                  setForm((p) => ({ ...p, vesselId, vesselName }))
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select vessel' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__empty__'>SELECT</SelectItem>
                  {vessels.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.vesselName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1 md:col-span-2'>
              <Label>Voyage</Label>
              <Input
                value={form.voyage}
                disabled={isViewMode}
                onChange={(e) => setForm((p) => ({ ...p, voyage: e.target.value }))}
              />
            </div>

            <div className='space-y-1'>
              <Label>Arrival Date</Label>
              <Input
                type='date'
                value={form.arrivalDate}
                disabled={isViewMode}
                onChange={(e) => setForm((p) => ({ ...p, arrivalDate: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>Berthing Date</Label>
              <Input
                type='date'
                value={form.berthingDate}
                disabled={isViewMode}
                onChange={(e) => setForm((p) => ({ ...p, berthingDate: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>Carrying Date</Label>
              <Input
                type='date'
                value={form.carryingDate}
                disabled={isViewMode}
                onChange={(e) => setForm((p) => ({ ...p, carryingDate: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>Document Dead Line</Label>
              <Input
                type='date'
                value={form.documentDeadline}
                disabled={isViewMode}
                onChange={(e) => setForm((p) => ({ ...p, documentDeadline: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>Payment CutOff</Label>
              <Input
                type='date'
                value={form.paymentCutOff}
                disabled={isViewMode}
                onChange={(e) => setForm((p) => ({ ...p, paymentCutOff: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>Manifest Ready [TRA]</Label>
              <Input
                type='date'
                value={form.manifestReadyTraDate}
                disabled={isViewMode}
                onChange={(e) => setForm((p) => ({ ...p, manifestReadyTraDate: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>Manifest Ready [Invoice]</Label>
              <Input
                type='date'
                value={form.manifestReadyInvoiceDate}
                disabled={isViewMode}
                onChange={(e) => setForm((p) => ({ ...p, manifestReadyInvoiceDate: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>Port Operator</Label>
              <Select
                value={form.portOperator || '__empty__'}
                disabled={isViewMode}
                onValueChange={(value) =>
                  setForm((p) => ({ ...p, portOperator: value === '__empty__' ? '' : value }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select port operator' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__empty__'>SELECT</SelectItem>
                  {PORT_OPERATOR_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label>Status</Label>
              <Select
                value={form.status}
                disabled={isViewMode}
                onValueChange={(v: 'ACTIVE' | 'INACTIVE') =>
                  setForm((prev) => ({ ...prev, status: v }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ACTIVE'>ACTIVE</SelectItem>
                  <SelectItem value='INACTIVE'>INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
              {isViewMode ? 'Close' : 'Cancel'}
            </Button>
            {!isViewMode ? (
              <Button onClick={() => void handleSubmitVoyage()} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : editingVoyageId ? 'Update' : 'Submit'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vessel voyage?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete voyage <strong>{deleteTarget?.voyage || ''}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLoading}
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteVoyage()
              }}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CustomsPage>
  )
}
