import { useEffect, useState } from 'react'
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
import { customsShipperApi, type SaveShipperPayload } from '@/lib/api'
import type { Shipper } from './shippers-storage'

type ShipperFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When null, modal is in create mode */
  shipperId: number | null
  onSaved: (shipper: Shipper) => void
  /** Read-only detail; requires `shipperId` when open */
  viewOnly?: boolean
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

function shipperToForm(s: Shipper): ShipperForm {
  return {
    name: s.name,
    address1: s.address1,
    address2: s.address2,
    address3: s.address3,
    city: s.city,
    country: s.country,
    email: s.email,
    contactName: s.contactName,
    designation: s.designation,
    telNo: s.telNo,
    extNo: s.extNo,
    faxNo: s.faxNo,
    contactEmail: s.contactEmail,
    mobile: s.mobile,
    ieCode: s.ieCode,
  }
}

function toSavePayload(form: ShipperForm): SaveShipperPayload {
  const trim = (v: string) => v.trim()
  return {
    name: trim(form.name),
    address1: trim(form.address1) || undefined,
    address2: trim(form.address2) || undefined,
    address3: trim(form.address3) || undefined,
    city: trim(form.city) || undefined,
    country: trim(form.country) || undefined,
    email: trim(form.email) || undefined,
    contactName: trim(form.contactName) || undefined,
    designation: trim(form.designation) || undefined,
    telNo: trim(form.telNo) || undefined,
    extNo: trim(form.extNo) || undefined,
    faxNo: trim(form.faxNo) || undefined,
    contactEmail: trim(form.contactEmail) || undefined,
    mobile: trim(form.mobile) || undefined,
    ieCode: trim(form.ieCode) || undefined,
  }
}

export function ShipperFormModal({
  open,
  onOpenChange,
  shipperId,
  onSaved,
  viewOnly = false,
}: ShipperFormModalProps) {
  const [form, setForm] = useState<ShipperForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof ShipperForm>(key: K, value: ShipperForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (!open) return

    if (!shipperId) {
      setForm(initialForm)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    customsShipperApi
      .get(shipperId)
      .then((s) => {
        if (!cancelled) setForm(shipperToForm(s))
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load shipper')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, shipperId])

  const handleSubmit = async () => {
    if (viewOnly) return
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    const payload = toSavePayload(form)
    setSaving(true)
    try {
      if (shipperId) {
        const updated = await customsShipperApi.update(shipperId, payload)
        onSaved(updated)
        toast.success('Shipper updated')
      } else {
        const created = await customsShipperApi.create(payload)
        onSaved(created)
        toast.success('Shipper created')
      }
      onOpenChange(false)
      setForm(initialForm)
    } catch {
      // Error toast from API interceptor
    } finally {
      setSaving(false)
    }
  }

  const title = viewOnly ? 'View shipper' : shipperId ? 'Edit Shipper' : 'Add Shipper'
  const fieldReadOnly = viewOnly

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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className='text-sm text-muted-foreground'>Loading…</p>
        ) : (
          <div className='max-h-[60vh] overflow-y-auto pr-1'>
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <div className='space-y-1'>
                <Label>Name</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Address 1</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.address1}
                  onChange={(e) => update('address1', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Address 2</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.address2}
                  onChange={(e) => update('address2', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Address 3</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.address3}
                  onChange={(e) => update('address3', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>City</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Country</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Company email</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Contact name</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.contactName}
                  onChange={(e) => update('contactName', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Designation</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.designation}
                  onChange={(e) => update('designation', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Tel no.</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.telNo}
                  onChange={(e) => update('telNo', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Extension</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.extNo}
                  onChange={(e) => update('extNo', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Fax no.</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.faxNo}
                  onChange={(e) => update('faxNo', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Contact email</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.contactEmail}
                  onChange={(e) => update('contactEmail', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>Mobile</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.mobile}
                  onChange={(e) => update('mobile', e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label>IE code</Label>
                <Input
                  readOnly={fieldReadOnly}
                  tabIndex={fieldReadOnly ? -1 : 0}
                  className={fieldReadOnly ? 'bg-muted/60' : undefined}
                  value={form.ieCode}
                  onChange={(e) => update('ieCode', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
          {!viewOnly ? (
            <Button onClick={handleSubmit} disabled={loading || saving}>
              {saving ? 'Saving…' : 'Submit'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
