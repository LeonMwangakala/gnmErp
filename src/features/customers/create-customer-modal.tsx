import { useState } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { customerApi, type CreateCustomerPayload } from '@/lib/api'

type CreateCustomerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

type FormState = {
  name: string
  contact: string
  email: string
  tax_number: string
  vrn: string
  short_name: string
  customer_number: string
  billing_name: string
  billing_phone: string
  billing_address: string
  billing_city: string
  billing_state: string
  billing_country: string
  billing_zip: string
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  shipping_city: string
  shipping_state: string
  shipping_country: string
  shipping_zip: string
}

const initialForm: FormState = {
  name: '',
  contact: '',
  email: '',
  tax_number: '',
  vrn: '',
  short_name: '',
  customer_number: '',
  billing_name: '',
  billing_phone: '',
  billing_address: '',
  billing_city: '',
  billing_state: '',
  billing_country: '',
  billing_zip: '',
  shipping_name: '',
  shipping_phone: '',
  shipping_address: '',
  shipping_city: '',
  shipping_state: '',
  shipping_country: '',
  shipping_zip: '',
}

export function CreateCustomerModal({ open, onOpenChange, onCreated }: CreateCustomerModalProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  /** When false, customer number is generated on the server (prefix + digits, same as torchlight-live API). */
  const [manualCustomerNumber, setManualCustomerNumber] = useState(false)

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const copyBillingToShipping = () => {
    setForm((prev) => ({
      ...prev,
      shipping_name: prev.billing_name,
      shipping_phone: prev.billing_phone,
      shipping_address: prev.billing_address,
      shipping_city: prev.billing_city,
      shipping_state: prev.billing_state,
      shipping_country: prev.billing_country,
      shipping_zip: prev.billing_zip,
    }))
    toast.success('Shipping address copied from billing')
  }

  const buildPayload = (): CreateCustomerPayload => {
    const base: CreateCustomerPayload = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      short_name: form.short_name.trim().slice(0, 6),
      tax_number: form.tax_number.trim() || undefined,
      vrn: form.vrn.trim() || undefined,
      billing_name: form.billing_name.trim() || undefined,
      billing_phone: form.billing_phone.trim() || undefined,
      billing_address: form.billing_address.trim() || undefined,
      billing_city: form.billing_city.trim() || undefined,
      billing_state: form.billing_state.trim() || undefined,
      billing_country: form.billing_country.trim() || undefined,
      billing_zip: form.billing_zip.trim() || undefined,
      shipping_name: form.shipping_name.trim() || undefined,
      shipping_phone: form.shipping_phone.trim() || undefined,
      shipping_address: form.shipping_address.trim() || undefined,
      shipping_city: form.shipping_city.trim() || undefined,
      shipping_state: form.shipping_state.trim() || undefined,
      shipping_country: form.shipping_country.trim() || undefined,
      shipping_zip: form.shipping_zip.trim() || undefined,
    }
    const cn = form.customer_number.trim()
    if (cn) {
      base.customer_number = cn
    }
    return base
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!form.contact.trim()) {
      toast.error('Phone number is required')
      return
    }
    if (!form.email.trim()) {
      toast.error('Email is required')
      return
    }
    if (!form.short_name.trim()) {
      toast.error('Short name is required')
      return
    }
    if (form.short_name.trim().length > 6) {
      toast.error('Short name must be at most 6 characters')
      return
    }
    if (manualCustomerNumber && !form.customer_number.trim()) {
      toast.error('Enter a customer number or turn off “Enter customer number manually” to auto-assign')
      return
    }

    setSubmitting(true)
    try {
      const result = await customerApi.createCustomer(buildPayload())
      if (result.ok) {
        const assigned = result.data.customer_number?.trim()
        if (assigned) {
          toast.success(`Customer created (number: ${assigned})`)
        } else {
          toast.success('Customer created successfully')
        }
        onCreated()
        onOpenChange(false)
        setForm(initialForm)
        return
      }
      toast.error(result.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setForm(initialForm)
          setManualCustomerNumber(false)
        }
      }}
    >
      <DialogContent className='max-h-[90vh] max-w-[720px] gap-0 p-0 sm:max-w-[720px]'>
        <DialogHeader className='border-b px-6 py-4'>
          <DialogTitle>Create customer</DialogTitle>
        </DialogHeader>

        <ScrollArea className='max-h-[calc(90vh-8rem)] px-6 py-4'>
          <div className='space-y-6 pr-3'>
            <section className='space-y-3'>
              <h3 className='text-sm font-semibold text-foreground'>Basic info</h3>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='space-y-1 md:col-span-2'>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Phone number</Label>
                  <Input value={form.contact} onChange={(e) => update('contact', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Email</Label>
                  <Input
                    type='email'
                    autoComplete='off'
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                </div>
                <div className='space-y-1'>
                  <Label>TIN number</Label>
                  <Input value={form.tax_number} onChange={(e) => update('tax_number', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>VRN number</Label>
                  <Input value={form.vrn} onChange={(e) => update('vrn', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Short name</Label>
                  <Input
                    maxLength={6}
                    value={form.short_name}
                    onChange={(e) => update('short_name', e.target.value)}
                    placeholder='Max 6 characters'
                  />
                </div>
                <div className='space-y-2 md:col-span-2'>
                  <div className='flex items-start gap-3 rounded-md border p-3'>
                    <Checkbox
                      id='manual-customer-number'
                      checked={manualCustomerNumber}
                      onCheckedChange={(v) => {
                        const on = v === true
                        setManualCustomerNumber(on)
                        if (!on) {
                          update('customer_number', '')
                        }
                      }}
                      className='mt-0.5'
                    />
                    <div className='space-y-1'>
                      <Label htmlFor='manual-customer-number' className='cursor-pointer font-normal leading-snug'>
                        Enter customer number manually
                      </Label>
                      <p className='text-xs text-muted-foreground'>
                        If unchecked, the server assigns the next number using your company customer prefix and the
                        same rules as the main app.
                      </p>
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <Label>Customer number</Label>
                    <Input
                      value={form.customer_number}
                      onChange={(e) => update('customer_number', e.target.value)}
                      placeholder={manualCustomerNumber ? 'e.g. CUST-000123' : 'Auto-assigned on save'}
                      disabled={!manualCustomerNumber}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className='space-y-3'>
              <h3 className='text-sm font-semibold text-foreground'>Billing address</h3>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <Label>Name</Label>
                  <Input value={form.billing_name} onChange={(e) => update('billing_name', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Phone</Label>
                  <Input value={form.billing_phone} onChange={(e) => update('billing_phone', e.target.value)} />
                </div>
                <div className='space-y-1 md:col-span-2'>
                  <Label>Address</Label>
                  <Textarea
                    rows={3}
                    value={form.billing_address}
                    onChange={(e) => update('billing_address', e.target.value)}
                  />
                </div>
                <div className='space-y-1'>
                  <Label>City</Label>
                  <Input value={form.billing_city} onChange={(e) => update('billing_city', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>State</Label>
                  <Input value={form.billing_state} onChange={(e) => update('billing_state', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Country</Label>
                  <Input value={form.billing_country} onChange={(e) => update('billing_country', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Zip code</Label>
                  <Input value={form.billing_zip} onChange={(e) => update('billing_zip', e.target.value)} />
                </div>
              </div>
            </section>

            <section className='space-y-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <h3 className='text-sm font-semibold text-foreground'>Shipping address</h3>
                <Button type='button' variant='secondary' size='sm' onClick={copyBillingToShipping}>
                  Same as billing
                </Button>
              </div>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <Label>Name</Label>
                  <Input value={form.shipping_name} onChange={(e) => update('shipping_name', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Phone</Label>
                  <Input value={form.shipping_phone} onChange={(e) => update('shipping_phone', e.target.value)} />
                </div>
                <div className='space-y-1 md:col-span-2'>
                  <Label>Address</Label>
                  <Textarea
                    rows={3}
                    value={form.shipping_address}
                    onChange={(e) => update('shipping_address', e.target.value)}
                  />
                </div>
                <div className='space-y-1'>
                  <Label>City</Label>
                  <Input value={form.shipping_city} onChange={(e) => update('shipping_city', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>State</Label>
                  <Input value={form.shipping_state} onChange={(e) => update('shipping_state', e.target.value)} />
                </div>
                <div className='space-y-1'>
                  <Label>Country</Label>
                  <Input
                    value={form.shipping_country}
                    onChange={(e) => update('shipping_country', e.target.value)}
                  />
                </div>
                <div className='space-y-1'>
                  <Label>Zip code</Label>
                  <Input value={form.shipping_zip} onChange={(e) => update('shipping_zip', e.target.value)} />
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className='border-t px-6 py-4'>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type='button' onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
