import { useEffect, useMemo, useState } from 'react'
import { Link2, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import { getStoredShippers, type Shipper } from './shippers-storage'
import {
  getStoredVessels,
  prependStoredVessel,
  saveStoredVessels,
  type Vessel,
} from './vessels-storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

type VesselForm = {
  status: 'ACTIVE' | 'INACTIVE'
  vesselName: string
  lineName: string
  vesselOwner: 'YES' | 'NO'
}

const initialVesselForm: VesselForm = {
  status: 'ACTIVE',
  vesselName: '',
  lineName: '',
  vesselOwner: 'NO',
}

export function CustomsVessels() {
  const [search, setSearch] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [form, setForm] = useState<VesselForm>(initialVesselForm)
  const [linkRows, setLinkRows] = useState<
    Array<{ vesselId: string; shipperId: string }>
  >([
    { vesselId: '', shipperId: '' },
  ])

  useEffect(() => {
    setVessels(getStoredVessels())
    setShippers(getStoredShippers())
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vessels
    return vessels.filter(
      (v) =>
        v.vesselName.toLowerCase().includes(q) ||
        v.lineName.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q)
    )
  }, [search, vessels])

  const handleCreateVessel = () => {
    if (!form.vesselName.trim()) {
      toast.error('Vessel name is required')
      return
    }

    const row: Vessel = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      status: form.status,
      vesselName: form.vesselName.trim(),
      lineName: form.lineName.trim(),
      vesselOwner: form.vesselOwner,
      linkedShipperIds: [],
    }
    prependStoredVessel(row)
    setVessels((prev) => [row, ...prev])
    setForm(initialVesselForm)
    setIsAddOpen(false)
    toast.success('Vessel added')
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
      return {
        ...v,
        linkedShipperIds: Array.from(new Set([...v.linkedShipperIds, ...nextShippers])),
      }
    })

    setVessels(updated)
    saveStoredVessels(updated)
    setIsLinkOpen(false)
    setLinkRows([{ vesselId: '', shipperId: '' }])
    toast.success('Vessel linked to shipper(s)')
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
              <Button onClick={() => setIsAddOpen(true)}>
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
              placeholder='Search vessels by name, line, status'
            />
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vessel Name</TableHead>
                  <TableHead>Line Name</TableHead>
                  <TableHead>Vessel Owner</TableHead>
                  <TableHead>Linked Shippers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                      No vessels yet. Click "Add Vessel" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((v, index) => (
                    <TableRow key={v.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{v.status}</TableCell>
                      <TableCell className='font-medium'>{v.vesselName}</TableCell>
                      <TableCell>{v.lineName || '-'}</TableCell>
                      <TableCell>{v.vesselOwner}</TableCell>
                      <TableCell>{v.linkedShipperIds.length}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] overflow-y-auto sm:max-w-[1100px]!'>
          <DialogHeader>
            <DialogTitle>Vessel Master</DialogTitle>
          </DialogHeader>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div className='space-y-1'>
              <Label>Vessel Name</Label>
              <Input
                value={form.vesselName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, vesselName: e.target.value }))
                }
              />
            </div>
            <div className='space-y-1'>
              <Label>Line Name</Label>
              <Input
                value={form.lineName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lineName: e.target.value }))
                }
              />
            </div>
            <div className='space-y-1'>
              <Label>Vessel Owner</Label>
              <Select
                value={form.vesselOwner}
                onValueChange={(v: 'YES' | 'NO') =>
                  setForm((prev) => ({ ...prev, vesselOwner: v }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='NO'>NO</SelectItem>
                  <SelectItem value='YES'>YES</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label>Status</Label>
              <Select
                value={form.status}
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
            <Button variant='outline' onClick={() => setIsAddOpen(false)}>
              Close
            </Button>
            <Button onClick={handleCreateVessel}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
