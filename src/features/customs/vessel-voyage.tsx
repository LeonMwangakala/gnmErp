import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import { getStoredVessels } from './vessels-storage'
import {
  getStoredVesselVoyages,
  prependStoredVesselVoyage,
  type VesselVoyage,
} from './vessel-voyage-storage'
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

type VesselOption = { id: number; vesselName: string }

type VesselVoyageForm = Omit<VesselVoyage, 'id' | 'createdAt'>

const initialForm: VesselVoyageForm = {
  status: 'ACTIVE',
  vesselId: null,
  vesselName: '',
  voyage: '',
  eta: '',
  arrivalDatePilotStation: '',
  berthingDate: '',
  berthingTime: '',
  documentDeadline: '',
  sailingDateEtd: '',
  sailingTime: '',
  paymentCutOff: '',
  manifestReadyTraDate: '',
  manifestReadyTraTime: '',
  manifestReadyInvoiceDate: '',
  manifestReadyInvoiceTime: '',
  portOperator: '',
}

export function CustomsVesselVoyage() {
  const [search, setSearch] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [voyages, setVoyages] = useState<VesselVoyage[]>([])
  const [vessels, setVessels] = useState<VesselOption[]>([])
  const [form, setForm] = useState<VesselVoyageForm>(initialForm)

  useEffect(() => {
    setVoyages(getStoredVesselVoyages())
    const vesselOptions = getStoredVessels().map((v) => ({
      id: v.id,
      vesselName: v.vesselName,
    }))
    setVessels(vesselOptions)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return voyages
    return voyages.filter(
      (row) =>
        row.vesselName.toLowerCase().includes(q) ||
        row.voyage.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
    )
  }, [search, voyages])

  const handleCreateVoyage = () => {
    if (!form.vesselId || !form.vesselName.trim()) {
      toast.error('Vessel is required')
      return
    }
    if (!form.voyage.trim()) {
      toast.error('Voyage is required')
      return
    }

    const row: VesselVoyage = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...form,
    }
    prependStoredVesselVoyage(row)
    setVoyages((prev) => [row, ...prev])
    setForm(initialForm)
    setIsAddOpen(false)
    toast.success('Vessel voyage added')
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
            <Button onClick={() => setIsAddOpen(true)}>
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
              placeholder='Search by vessel, voyage or status'
            />
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vessel</TableHead>
                  <TableHead>Voyage</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Port Operator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                      No vessel voyages yet. Click "Add Vessel Voyage" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell className='font-medium'>{row.vesselName}</TableCell>
                      <TableCell>{row.voyage}</TableCell>
                      <TableCell>{row.eta || '-'}</TableCell>
                      <TableCell>{row.portOperator || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] overflow-y-auto sm:max-w-[1200px]!'>
          <DialogHeader>
            <DialogTitle>Vessel Voyage</DialogTitle>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
            <div className='space-y-1 md:col-span-2'>
              <Label>Vessel</Label>
              <div className='flex items-center gap-2'>
                <div className='flex-1'>
                  <Select
                    value={form.vesselId ? String(form.vesselId) : '__empty__'}
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
                <Button type='button' size='icon' variant='outline'>
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
            </div>
            <div className='space-y-1 md:col-span-2'>
              <Label>Voyage</Label>
              <Input value={form.voyage} onChange={(e) => setForm((p) => ({ ...p, voyage: e.target.value }))} />
            </div>

            <div className='space-y-1'>
              <Label>ETA</Label>
              <Input type='date' value={form.eta} onChange={(e) => setForm((p) => ({ ...p, eta: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <Label>Arrival Date Pilot Station</Label>
              <Input type='date' value={form.arrivalDatePilotStation} onChange={(e) => setForm((p) => ({ ...p, arrivalDatePilotStation: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <Label>Berthing Date</Label>
              <Input type='date' value={form.berthingDate} onChange={(e) => setForm((p) => ({ ...p, berthingDate: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <Label>Time</Label>
              <Input type='time' value={form.berthingTime} onChange={(e) => setForm((p) => ({ ...p, berthingTime: e.target.value }))} />
            </div>

            <div className='space-y-1'>
              <Label>Sailing Date/ETD</Label>
              <Input type='date' value={form.sailingDateEtd} onChange={(e) => setForm((p) => ({ ...p, sailingDateEtd: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <Label>Time</Label>
              <Input type='time' value={form.sailingTime} onChange={(e) => setForm((p) => ({ ...p, sailingTime: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <Label>Document Dead Line</Label>
              <Input type='date' value={form.documentDeadline} onChange={(e) => setForm((p) => ({ ...p, documentDeadline: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <Label>Payment CutOff</Label>
              <Input type='date' value={form.paymentCutOff} onChange={(e) => setForm((p) => ({ ...p, paymentCutOff: e.target.value }))} />
            </div>

            <div className='space-y-1'>
              <Label>Manifest Ready [TRA]</Label>
              <Input type='date' value={form.manifestReadyTraDate} onChange={(e) => setForm((p) => ({ ...p, manifestReadyTraDate: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <Label>Time</Label>
              <Input type='time' value={form.manifestReadyTraTime} onChange={(e) => setForm((p) => ({ ...p, manifestReadyTraTime: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <Label>Manifest Ready [Invoice]</Label>
              <Input type='date' value={form.manifestReadyInvoiceDate} onChange={(e) => setForm((p) => ({ ...p, manifestReadyInvoiceDate: e.target.value }))} />
            </div>
            <div className='space-y-1'>
              <Label>Time</Label>
              <Input type='time' value={form.manifestReadyInvoiceTime} onChange={(e) => setForm((p) => ({ ...p, manifestReadyInvoiceTime: e.target.value }))} />
            </div>

            <div className='space-y-1'>
              <Label>Port Operator</Label>
              <Select
                value={form.portOperator || '__empty__'}
                onValueChange={(v) => setForm((p) => ({ ...p, portOperator: v === '__empty__' ? '' : v }))}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='SELECT' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__empty__'>SELECT</SelectItem>
                  <SelectItem value='TPA'>TPA</SelectItem>
                  <SelectItem value='TICTS'>TICTS</SelectItem>
                  <SelectItem value='ADANI'>ADANI</SelectItem>
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
            <Button onClick={handleCreateVoyage}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomsPage>
  )
}
