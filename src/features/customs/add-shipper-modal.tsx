import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { prependStoredShipper, type Shipper } from './shippers-storage'

type AddShipperModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (shipper: Shipper) => void
}

type ShipperForm = Omit<Shipper, 'id' | 'createdAt'>

const initialForm: ShipperForm = {
  name: '',
  address1: '',
  address2: '',
  address3: '',
  city: '',
  country: '',
  email: '',
  contactName: '',
  designation: '',
  telNo: '',
  extNo: '',
  faxNo: '',
  contactEmail: '',
  mobile: '',
  ieCode: '',
}

export function AddShipperModal({
  open,
  onOpenChange,
  onCreated,
}: AddShipperModalProps) {
  const [form, setForm] = useState<ShipperForm>(initialForm)

  const update = <K extends keyof ShipperForm>(key: K, value: ShipperForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    const shipper: Shipper = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...form,
    }

    prependStoredShipper(shipper)
    onCreated(shipper)
    onOpenChange(false)
    setForm(initialForm)
    toast.success('Shipper added successfully')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          setForm(initialForm)
        }
      }}
    >
      <DialogContent className='max-w-[95vw]! w-[95vw]! sm:max-w-[1000px]'>
        <DialogHeader>
          <DialogTitle>Add Shipper</DialogTitle>
        </DialogHeader>

        <div className='max-h-[60vh] overflow-y-auto pr-1'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            <div className='space-y-1'>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Address 1</Label>
              <Input value={form.address1} onChange={(e) => update('address1', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => update('country', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Contact Name</Label>
              <Input
                value={form.contactName}
                onChange={(e) => update('contactName', e.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => update('designation', e.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Tel No.</Label>
              <Input value={form.telNo} onChange={(e) => update('telNo', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Extn No.</Label>
              <Input value={form.extNo} onChange={(e) => update('extNo', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Fax No.</Label>
              <Input value={form.faxNo} onChange={(e) => update('faxNo', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Email</Label>
              <Input
                value={form.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Mobile</Label>
              <Input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Ie Code</Label>
              <Input value={form.ieCode} onChange={(e) => update('ieCode', e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
