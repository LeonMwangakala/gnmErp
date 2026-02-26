import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { vendorApi } from '@/lib/api'
import { Loader2 } from 'lucide-react'

interface VendorDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: number | undefined
}

export function VendorDetailModal({
  open,
  onOpenChange,
  vendorId,
}: VendorDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (open && vendorId) {
      fetchData()
    }
  }, [open, vendorId])

  const fetchData = async () => {
    if (!vendorId) return

    setIsLoading(true)
    try {
      const response = await vendorApi.getVendor(vendorId)
      setData(response)
    } catch (error: any) {
      console.error('Failed to load vendor details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!vendorId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto !sm:max-w-[95vw] !md:max-w-[95vw] !lg:max-w-[90vw] !xl:max-w-[85vw]">
        <DialogHeader>
          <DialogTitle>Vendor Details</DialogTitle>
          <DialogDescription>View detailed information about this vendor</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vendor Number</p>
                  <p className="font-medium">{data.vendor_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{data.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Short Name</p>
                  <p className="font-medium">{data.short_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium">{data.contact}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{data.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">TIN Number</p>
                  <p className="font-medium">{data.tax_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">VRN Number</p>
                  <p className="font-medium">{data.vrn || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="font-medium">{data.balance_formatted}</p>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            {(data.billing_name || data.billing_address) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{data.billing_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{data.billing_phone || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{data.billing_address || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium">{data.billing_city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">State</p>
                      <p className="font-medium">{data.billing_state || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Country</p>
                      <p className="font-medium">{data.billing_country || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Zip Code</p>
                      <p className="font-medium">{data.billing_zip || '-'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Shipping Address */}
            {(data.shipping_name || data.shipping_address) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{data.shipping_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{data.shipping_phone || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{data.shipping_address || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">City</p>
                      <p className="font-medium">{data.shipping_city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">State</p>
                      <p className="font-medium">{data.shipping_state || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Country</p>
                      <p className="font-medium">{data.shipping_country || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Zip Code</p>
                      <p className="font-medium">{data.shipping_zip || '-'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
