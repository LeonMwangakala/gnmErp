import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ChevronDown,
  Eye,
  Link2,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import { type Shipper } from './shippers-storage'
import { getStoredVessels, saveStoredVessels, type Vessel } from './vessels-storage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { customsShipperApi, customsVesselApi } from '@/lib/api'

type VesselFormDialog = null | { mode: 'add' } | { mode: 'edit'; id: number }

type VesselForm = {
  vesselName: string
  imo: string
  mmsi: string
  built: string
  grossTonnage: string
  deadweight: string
  size: string
  imageFile: File | null
}

const initialVesselForm: VesselForm = {
  vesselName: '',
  imo: '',
  mmsi: '',
  built: '',
  grossTonnage: '',
  deadweight: '',
  size: '',
  imageFile: null,
}

export function CustomsVessels() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [formDialog, setFormDialog] = useState<VesselFormDialog>(null)
  const [viewingVessel, setViewingVessel] = useState<Vessel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vessel | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionMenuOpenForId, setActionMenuOpenForId] = useState<number | null>(null)
  const actionMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsLoading, setVesselsLoading] = useState(false)
  const [savingVessel, setSavingVessel] = useState(false)
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [form, setForm] = useState<VesselForm>(initialVesselForm)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [linkRows, setLinkRows] = useState<
    Array<{ vesselId: string; shipperId: string }>
  >([
    { vesselId: '', shipperId: '' },
  ])

  const loadVessels = useCallback(async () => {
    setVesselsLoading(true)
    try {
      const res = await customsVesselApi.list({ per_page: 200, page: 1 })
      setVessels(res.data)
      saveStoredVessels(res.data)
    } catch {
      setVessels(getStoredVessels())
    } finally {
      setVesselsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVessels()
  }, [loadVessels])

  const loadShippers = useCallback(() => {
    customsShipperApi
      .list({ per_page: 200, page: 1 })
      .then((res) => setShippers(res.data))
      .catch(() => setShippers([]))
  }, [])

  useEffect(() => {
    if (isLinkOpen) loadShippers()
  }, [isLinkOpen, loadShippers])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  const cancelActionMenuClose = useCallback(() => {
    if (actionMenuCloseTimerRef.current) {
      clearTimeout(actionMenuCloseTimerRef.current)
      actionMenuCloseTimerRef.current = null
    }
  }, [])

  const scheduleActionMenuClose = useCallback(() => {
    cancelActionMenuClose()
    actionMenuCloseTimerRef.current = setTimeout(() => {
      setActionMenuOpenForId(null)
      actionMenuCloseTimerRef.current = null
    }, 200)
  }, [cancelActionMenuClose])

  useEffect(() => () => cancelActionMenuClose(), [cancelActionMenuClose])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vessels
    return vessels.filter(
      (v) =>
        v.vesselName.toLowerCase().includes(q) ||
        v.imo.toLowerCase().includes(q) ||
        v.mmsi.toLowerCase().includes(q)
    )
  }, [search, vessels])

  const resetAddForm = useCallback(() => {
    setForm(initialVesselForm)
    setImagePreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    if (imageInputRef.current) imageInputRef.current.value = ''
  }, [])

  const buildPayloadFromForm = () => {
    const builtStr = form.built.trim()
    let built: number | null = null
    if (builtStr) {
      const y = parseInt(builtStr, 10)
      if (!Number.isFinite(y) || y < 1800 || y > 2100) {
        return { error: 'Built must be a year between 1800 and 2100' as const }
      }
      built = y
    }

    const gtStr = form.grossTonnage.trim()
    const dwStr = form.deadweight.trim()
    const grossTonnage = gtStr ? Number(gtStr) : null
    const deadweight = dwStr ? Number(dwStr) : null
    if (gtStr && !Number.isFinite(grossTonnage)) {
      return { error: 'Gross tonnage must be a number' as const }
    }
    if (dwStr && !Number.isFinite(deadweight)) {
      return { error: 'Deadweight must be a number' as const }
    }

    return {
      payload: {
        vesselName: form.vesselName.trim(),
        imo: form.imo.trim() || null,
        mmsi: form.mmsi.trim() || null,
        built,
        grossTonnage: grossTonnage != null && Number.isFinite(grossTonnage) ? grossTonnage : null,
        deadweight: deadweight != null && Number.isFinite(deadweight) ? deadweight : null,
        size: form.size.trim() || null,
        image: form.imageFile,
      },
    }
  }

  const handleSubmitVesselForm = async () => {
    if (!form.vesselName.trim()) {
      toast.error('Vessel name is required')
      return
    }

    const parsed = buildPayloadFromForm()
    if ('error' in parsed) {
      toast.error(parsed.error)
      return
    }
    const { payload } = parsed

    setSavingVessel(true)
    try {
      if (formDialog?.mode === 'edit') {
        const updated = await customsVesselApi.update(formDialog.id, payload)
        const nextVessels = vessels.map((v) => (v.id === updated.id ? updated : v))
        setVessels(nextVessels)
        saveStoredVessels(nextVessels)
        resetAddForm()
        setFormDialog(null)
        toast.success('Vessel updated')

        void customsShipperApi
          .syncVesselShipperLinks(
            nextVessels.map((v) => ({
              external_id: String(v.id),
              shipper_ids: v.linkedShipperIds,
            }))
          )
          .catch(() => {})
      } else {
        const created = await customsVesselApi.create(payload)
        const nextVessels = [created, ...vessels.filter((v) => v.id !== created.id)]
        setVessels(nextVessels)
        saveStoredVessels(nextVessels)
        resetAddForm()
        setFormDialog(null)
        toast.success('Vessel created')

        void customsShipperApi
          .syncVesselShipperLinks(
            nextVessels.map((v) => ({
              external_id: String(v.id),
              shipper_ids: v.linkedShipperIds,
            }))
          )
          .catch(() => {})
      }
    } catch {
      // interceptor toast
    } finally {
      setSavingVessel(false)
    }
  }

  const openEditVessel = (v: Vessel) => {
    setForm({
      vesselName: v.vesselName,
      imo: v.imo,
      mmsi: v.mmsi,
      built: v.built != null ? String(v.built) : '',
      grossTonnage: v.grossTonnage != null ? String(v.grossTonnage) : '',
      deadweight: v.deadweight != null ? String(v.deadweight) : '',
      size: v.size,
      imageFile: null,
    })
    setImagePreviewUrl(v.imageUrl || null)
    if (imageInputRef.current) imageInputRef.current.value = ''
    setFormDialog({ mode: 'edit', id: v.id })
  }

  const handleConfirmDeleteVessel = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await customsVesselApi.delete(deleteTarget.id)
      const nextVessels = vessels.filter((v) => v.id !== deleteTarget.id)
      setVessels(nextVessels)
      saveStoredVessels(nextVessels)
      setDeleteTarget(null)
      toast.success('Vessel deleted')

      void customsShipperApi
        .syncVesselShipperLinks(
          nextVessels.map((v) => ({
            external_id: String(v.id),
            shipper_ids: v.linkedShipperIds,
          }))
        )
        .catch(() => {})
    } catch {
      // interceptor toast
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleLinkVesselToShippers = () => {
    const pairs = linkRows
      .map((r) => ({
        vesselId: Number(r.vesselId),
        shipperId: Number(r.shipperId),
      }))
      .filter(
        (r) =>
          Number.isFinite(r.vesselId) &&
          r.vesselId > 0 &&
          Number.isFinite(r.shipperId) &&
          r.shipperId > 0
      )

    if (pairs.length === 0) {
      toast.error('Select at least one Vessel + Shipper link row')
      return
    }

    const grouped = pairs.reduce<Record<number, number[]>>((acc, row) => {
      if (!acc[row.vesselId]) acc[row.vesselId] = []
      acc[row.vesselId].push(row.shipperId)
      return acc
    }, {})

    const updated = vessels.map((v) => {
      const nextShippers = grouped[v.id]
      if (!nextShippers) return v
      const mergedIds = Array.from(new Set([...v.linkedShipperIds, ...nextShippers]))
      const linkedShippers = mergedIds.map((id) => {
        const prev = v.linkedShippers.find((s) => s.id === id)
        if (prev?.name) return prev
        const name = shippers.find((s) => s.id === id)?.name ?? ''
        return { id, name }
      })
      return {
        ...v,
        linkedShipperIds: mergedIds,
        linkedShippers,
      }
    })

    setVessels(updated)
    saveStoredVessels(updated)
    setIsLinkOpen(false)
    setLinkRows([{ vesselId: '', shipperId: '' }])
    toast.success('Vessel linked to shipper(s)')

    void customsShipperApi
      .syncVesselShipperLinks(
        updated.map((v) => ({
          external_id: String(v.id),
          shipper_ids: v.linkedShipperIds,
        }))
      )
      .catch(() => {
        // error toast from API client
      })
  }

  return (
    <CustomsPage
      title='Vessels'
      description='Maintain vessels used in customs and shipping workflows.'
    >
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle>Vessels</CardTitle>
              <CardDescription>List of vessel master records</CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Button variant='outline' onClick={() => setIsLinkOpen(true)}>
                <Link2 className='mr-2 h-4 w-4' />
                Link Vessel to Shipper
              </Button>
              <Button
                onClick={() => {
                  resetAddForm()
                  setFormDialog({ mode: 'add' })
                }}
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Vessel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='relative mb-4 max-w-md'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              className='pl-8'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search by name, IMO, or MMSI'
            />
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-12'>S/N</TableHead>
                  <TableHead className='w-16'>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>IMO</TableHead>
                  <TableHead>MMSI</TableHead>
                  <TableHead className='w-[120px] text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vesselsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                      Loading vessels…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                      No vessels yet. Click "Add Vessel" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((v, index) => (
                    <TableRow key={v.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {v.imageUrl ? (
                          <img
                            src={v.imageUrl}
                            alt=''
                            className='h-9 w-12 rounded border object-cover'
                            onError={(e) => {
                              e.currentTarget.style.visibility = 'hidden'
                            }}
                          />
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </TableCell>
                      <TableCell className='font-medium'>{v.vesselName}</TableCell>
                      <TableCell>{v.imo || '—'}</TableCell>
                      <TableCell>{v.mmsi || '—'}</TableCell>
                      <TableCell className='text-right'>
                        <DropdownMenu
                          modal={false}
                          open={actionMenuOpenForId === v.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              cancelActionMenuClose()
                              setActionMenuOpenForId((cur) => (cur === v.id ? null : cur))
                            }
                          }}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-8 gap-1 px-2'
                              onPointerEnter={() => {
                                cancelActionMenuClose()
                                setActionMenuOpenForId(v.id)
                              }}
                              onPointerLeave={scheduleActionMenuClose}
                            >
                              Options
                              <ChevronDown className='h-4 w-4 opacity-70' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align='end'
                            className='w-44'
                            onPointerEnter={cancelActionMenuClose}
                            onPointerLeave={scheduleActionMenuClose}
                            onCloseAutoFocus={(e) => e.preventDefault()}
                          >
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => {
                                setViewingVessel(v)
                                setActionMenuOpenForId(null)
                              }}
                            >
                              <Eye className='mr-2 h-4 w-4' />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                openEditVessel(v)
                                setActionMenuOpenForId(null)
                              }}
                            >
                              <Pencil className='mr-2 h-4 w-4' />
                              Update
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-destructive focus:text-destructive'
                              onSelect={() => {
                                setDeleteTarget(v)
                                setActionMenuOpenForId(null)
                              }}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Delete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => {
                                setActionMenuOpenForId(null)
                                navigate({
                                  to: '/customs/vessel-voyage',
                                  search: { vesselId: v.id },
                                })
                              }}
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
        open={formDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFormDialog(null)
            resetAddForm()
          }
        }}
      >
        <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] overflow-y-auto sm:max-w-[1100px]!'>
          <DialogHeader>
            <DialogTitle>
              {formDialog?.mode === 'edit' ? 'Update vessel' : 'Vessel Master'}
            </DialogTitle>
          </DialogHeader>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div className='space-y-1 md:col-span-2'>
              <Label>Image</Label>
              <Input
                ref={imageInputRef}
                type='file'
                accept='image/*'
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setForm((prev) => ({ ...prev, imageFile: file }))
                  setImagePreviewUrl((prev) => {
                    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
                    return file ? URL.createObjectURL(file) : null
                  })
                }}
              />
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt='Preview'
                  className='mt-2 h-24 max-w-xs rounded-md border object-contain'
                />
              ) : null}
            </div>
            <div className='space-y-1'>
              <Label>Name</Label>
              <Input
                value={form.vesselName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, vesselName: e.target.value }))
                }
              />
            </div>
            <div className='space-y-1'>
              <Label>IMO</Label>
              <Input
                value={form.imo}
                onChange={(e) => setForm((prev) => ({ ...prev, imo: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>MMSI</Label>
              <Input
                value={form.mmsi}
                onChange={(e) => setForm((prev) => ({ ...prev, mmsi: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>BUILT (year)</Label>
              <Input
                inputMode='numeric'
                placeholder='e.g. 2010'
                value={form.built}
                onChange={(e) => setForm((prev) => ({ ...prev, built: e.target.value }))}
              />
            </div>
            <div className='space-y-1'>
              <Label>Gross Tonnage</Label>
              <Input
                inputMode='decimal'
                value={form.grossTonnage}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, grossTonnage: e.target.value }))
                }
              />
            </div>
            <div className='space-y-1'>
              <Label>Deadweight</Label>
              <Input
                inputMode='decimal'
                value={form.deadweight}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, deadweight: e.target.value }))
                }
              />
            </div>
            <div className='space-y-1 md:col-span-2'>
              <Label>Size</Label>
              <Input
                value={form.size}
                onChange={(e) => setForm((prev) => ({ ...prev, size: e.target.value }))}
              />
            </div>
            <p className='text-xs text-muted-foreground md:col-span-2'>
              Link this vessel to shippers after creation using &quot;Link Vessel to Shipper&quot;.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setFormDialog(null)
                resetAddForm()
              }}
              disabled={savingVessel}
            >
              Close
            </Button>
            <Button onClick={() => void handleSubmitVesselForm()} disabled={savingVessel}>
              {savingVessel ? 'Saving…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewingVessel !== null} onOpenChange={(open) => !open && setViewingVessel(null)}>
        <DialogContent className='max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl'>
          {viewingVessel ? (
            <>
              <DialogHeader className='space-y-1 border-b bg-muted/30 px-6 py-4 text-left'>
                <DialogTitle className='text-xl font-semibold tracking-tight'>
                  {viewingVessel.vesselName}
                </DialogTitle>
                <DialogDescription className='text-sm text-muted-foreground'>
                  {[viewingVessel.imo && `IMO ${viewingVessel.imo}`, viewingVessel.mmsi && `MMSI ${viewingVessel.mmsi}`]
                    .filter(Boolean)
                    .join(' · ') || 'Vessel master record'}
                </DialogDescription>
              </DialogHeader>
              <div className='grid gap-6 px-6 py-5 md:grid-cols-[minmax(0,220px)_1fr]'>
                <div className='flex flex-col gap-2'>
                  <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                    Photo
                  </span>
                  <div className='flex aspect-4/3 max-h-52 items-center justify-center overflow-hidden rounded-lg border bg-muted/50'>
                    {viewingVessel.imageUrl ? (
                      <img
                        src={viewingVessel.imageUrl}
                        alt=''
                        className='h-full w-full object-contain'
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className='px-3 text-center text-sm text-muted-foreground'>
                        No image on file
                      </span>
                    )}
                  </div>
                  <div className='flex items-center gap-2 pt-1'>
                    <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                      Status
                    </span>
                    <Badge variant={viewingVessel.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {viewingVessel.status}
                    </Badge>
                  </div>
                </div>
                <div className='space-y-4'>
                  <div>
                    <h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                      Specifications
                    </h4>
                    <div className='rounded-lg border bg-card px-1'>
                      {(
                        [
                          ['Built', viewingVessel.built != null ? String(viewingVessel.built) : '—'],
                          [
                            'Gross tonnage',
                            viewingVessel.grossTonnage != null
                              ? viewingVessel.grossTonnage.toLocaleString()
                              : '—',
                          ],
                          [
                            'Deadweight',
                            viewingVessel.deadweight != null
                              ? viewingVessel.deadweight.toLocaleString()
                              : '—',
                          ],
                          ['Size', viewingVessel.size || '—'],
                        ] as const
                      ).map(([label, value]) => (
                        <div
                          key={label}
                          className='flex items-baseline justify-between gap-4 border-b px-3 py-2.5 text-sm last:border-b-0'
                        >
                          <span className='text-muted-foreground'>{label}</span>
                          <span className='text-right font-medium tabular-nums'>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                      Linked shippers
                    </h4>
                    {viewingVessel.linkedShippers.length === 0 ? (
                      <p className='rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground'>
                        No shippers linked yet. Use &quot;Link Vessel to Shipper&quot; to attach
                        shippers.
                      </p>
                    ) : (
                      <ul className='flex flex-wrap gap-2 rounded-lg border bg-card p-3'>
                        {viewingVessel.linkedShippers.map((s) => (
                          <li key={s.id}>
                            <Badge variant='secondary' className='max-w-full px-3 py-1 font-normal'>
                              <span className='block truncate'>
                                {s.name?.trim() ? s.name : 'Name unavailable'}
                              </span>
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
              <DialogFooter className='flex-row justify-end gap-2 border-t bg-muted/20 px-6 py-4'>
                <Button variant='outline' onClick={() => setViewingVessel(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vessel?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will remove "${deleteTarget.vesselName}" and its shipper links. This action cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={deleteLoading}
              onClick={(e) => {
                e.preventDefault()
                void handleConfirmDeleteVessel()
              }}
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] overflow-y-auto sm:max-w-[1100px]!'>
          <DialogHeader>
            <DialogTitle>Vessel Shared by Shippers</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='grid grid-cols-1 gap-3 rounded-md border p-3'>
              <div className='flex items-end'>
                <Button
                  variant='outline'
                  onClick={() =>
                    setLinkRows((prev) => [...prev, { vesselId: '', shipperId: '' }])
                  }
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Add Link Row
                </Button>
              </div>
            </div>

            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vessel</TableHead>
                    <TableHead>Shipper</TableHead>
                    <TableHead className='w-[90px] text-right'>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkRows.map((row, index) => (
                    <TableRow key={`link-row-${index}`}>
                      <TableCell>
                        <Select
                          value={row.vesselId || '__empty__'}
                          onValueChange={(v) =>
                            setLinkRows((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      vesselId: v === '__empty__' ? '' : v,
                                    }
                                  : item
                              )
                            )
                          }
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select vessel' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='__empty__'>Select</SelectItem>
                            {vessels.map((v) => (
                              <SelectItem key={v.id} value={String(v.id)}>
                                {v.vesselName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.shipperId || '__empty__'}
                          onValueChange={(v) =>
                            setLinkRows((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      shipperId: v === '__empty__' ? '' : v,
                                    }
                                  : item
                              )
                            )
                          }
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select shipper' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='__empty__'>Select</SelectItem>
                            {shippers.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='icon'
                          disabled={linkRows.length === 1}
                          onClick={() =>
                            setLinkRows((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsLinkOpen(false)}>
              Close
            </Button>
            <Button onClick={handleLinkVesselToShippers}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomsPage>
  )
}
