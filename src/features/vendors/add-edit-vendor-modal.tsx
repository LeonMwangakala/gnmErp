import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { vendorApi } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Vendor } from './index'

interface AddEditVendorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendor: Vendor | null
  onSuccess: () => void
}

export function AddEditVendorModal({
  open,
  onOpenChange,
  vendor,
  onSuccess,
}: AddEditVendorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    contact: '',
    email: '',
    tax_number: '',
    vrn: '',
    short_name: '',
    vendor_number: '',
    billing_name: '',
    billing_country: '',
    billing_state: '',
    billing_city: '',
    billing_phone: '',
    billing_zip: '',
    billing_address: '',
    shipping_name: '',
    shipping_country: '',
    shipping_state: '',
    shipping_city: '',
    shipping_phone: '',
    shipping_zip: '',
    shipping_address: '',
  })

  useEffect(() => {
    if (open) {
      if (vendor) {
        loadVendorData()
      } else {
        setForm({
          name: '',
          contact: '',
          email: '',
          tax_number: '',
          vrn: '',
          short_name: '',
          vendor_number: '',
          billing_name: '',
          billing_country: '',
          billing_state: '',
          billing_city: '',
          billing_phone: '',
          billing_zip: '',
          billing_address: '',
          shipping_name: '',
          shipping_country: '',
          shipping_state: '',
          shipping_city: '',
          shipping_phone: '',
          shipping_zip: '',
          shipping_address: '',
        })
      }
    }
  }, [open, vendor])

  const loadVendorData = async () => {
    if (!vendor) return

    setIsLoading(true)
    try {
      const data = await vendorApi.getVendor(vendor.id)
      setForm({
        name: data.name || '',
        contact: data.contact || '',
        email: data.email || '',
        tax_number: data.tax_number || '',
        vrn: data.vrn || '',
        short_name: data.short_name || '',
        vendor_number: data.vendor_number || '',
        billing_name: data.billing_name || '',
        billing_country: data.billing_country || '',
        billing_state: data.billing_state || '',
        billing_city: data.billing_city || '',
        billing_phone: data.billing_phone || '',
        billing_zip: data.billing_zip || '',
        billing_address: data.billing_address || '',
        shipping_name: data.shipping_name || '',
        shipping_country: data.shipping_country || '',
        shipping_state: data.shipping_state || '',
        shipping_city: data.shipping_city || '',
        shipping_phone: data.shipping_phone || '',
        shipping_zip: data.shipping_zip || '',
        shipping_address: data.shipping_address || '',
      })
    } catch (error: any) {
      toast.error('Failed to load vendor data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyBillingToShipping = () => {
    setForm((prev) => ({
      ...prev,
      shipping_name: prev.billing_name,
      shipping_country: prev.billing_country,
      shipping_state: prev.billing_state,
      shipping_city: prev.billing_city,
      shipping_phone: prev.billing_phone,
      shipping_zip: prev.billing_zip,
      shipping_address: prev.billing_address,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (vendor) {
        await vendorApi.updateVendor(vendor.id, form)
        toast.success('Vendor updated successfully')
      } else {
        await vendorApi.createVendor(form)
        toast.success('Vendor created successfully')
      }
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save vendor')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto sm:!max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            {vendor ? 'Edit Vendor' : 'Create New Vendor'}
          </DialogTitle>
          <DialogDescription>
            {vendor
              ? 'Update the vendor information'
              : 'Add a new vendor to your system'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Info</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Enter vendor name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contact"
                    type="tel"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    required
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="Enter email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_number">TIN Number</Label>
                  <Input
                    id="tax_number"
                    value={form.tax_number}
                    onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                    placeholder="Enter TIN number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vrn">VRN Number</Label>
                  <Input
                    id="vrn"
                    value={form.vrn}
                    onChange={(e) => setForm({ ...form, vrn: e.target.value })}
                    placeholder="Enter VRN number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short_name">
                    Short Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="short_name"
                    value={form.short_name}
                    onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                    required
                    placeholder="Enter short name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor_number">
                    Vendor Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vendor_number"
                    value={form.vendor_number}
                    onChange={(e) => setForm({ ...form, vendor_number: e.target.value })}
                    required
                    placeholder="Enter vendor number"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_name">Name</Label>
                  <Input
                    id="billing_name"
                    value={form.billing_name}
                    onChange={(e) => setForm({ ...form, billing_name: e.target.value })}
                    placeholder="Enter billing name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_phone">Phone</Label>
                  <Input
                    id="billing_phone"
                    value={form.billing_phone}
                    onChange={(e) => setForm({ ...form, billing_phone: e.target.value })}
                    placeholder="Enter billing phone"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="billing_address">Address</Label>
                  <Textarea
                    id="billing_address"
                    value={form.billing_address}
                    onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                    placeholder="Enter billing address"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_city">City</Label>
                  <Input
                    id="billing_city"
                    value={form.billing_city}
                    onChange={(e) => setForm({ ...form, billing_city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_state">State</Label>
                  <Input
                    id="billing_state"
                    value={form.billing_state}
                    onChange={(e) => setForm({ ...form, billing_state: e.target.value })}
                    placeholder="Enter state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_country">Country</Label>
                  <Input
                    id="billing_country"
                    value={form.billing_country}
                    onChange={(e) => setForm({ ...form, billing_country: e.target.value })}
                    placeholder="Enter country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_zip">Zip Code</Label>
                  <Input
                    id="billing_zip"
                    value={form.billing_zip}
                    onChange={(e) => setForm({ ...form, billing_zip: e.target.value })}
                    placeholder="Enter zip code"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Shipping Address</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyBillingToShipping}
                >
                  Copy from Billing
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_name">Name</Label>
                  <Input
                    id="shipping_name"
                    value={form.shipping_name}
                    onChange={(e) => setForm({ ...form, shipping_name: e.target.value })}
                    placeholder="Enter shipping name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_phone">Phone</Label>
                  <Input
                    id="shipping_phone"
                    value={form.shipping_phone}
                    onChange={(e) => setForm({ ...form, shipping_phone: e.target.value })}
                    placeholder="Enter shipping phone"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="shipping_address">Address</Label>
                  <Textarea
                    id="shipping_address"
                    value={form.shipping_address}
                    onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                    placeholder="Enter shipping address"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_city">City</Label>
                  <Input
                    id="shipping_city"
                    value={form.shipping_city}
                    onChange={(e) => setForm({ ...form, shipping_city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_state">State</Label>
                  <Input
                    id="shipping_state"
                    value={form.shipping_state}
                    onChange={(e) => setForm({ ...form, shipping_state: e.target.value })}
                    placeholder="Enter state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_country">Country</Label>
                  <Input
                    id="shipping_country"
                    value={form.shipping_country}
                    onChange={(e) => setForm({ ...form, shipping_country: e.target.value })}
                    placeholder="Enter country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping_zip">Zip Code</Label>
                  <Input
                    id="shipping_zip"
                    value={form.shipping_zip}
                    onChange={(e) => setForm({ ...form, shipping_zip: e.target.value })}
                    placeholder="Enter zip code"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {vendor ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
