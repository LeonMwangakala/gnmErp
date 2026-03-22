import { useEffect, useState } from 'react'
import { Loader2, Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { invoiceApi } from '@/lib/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/** CMTS `invoice-consignments-goods` payload (flexible nested shapes) */
export interface GoodConsignmentLine {
  id: number
  quantity: number
  pkgs: number
  unit: string
  good: Record<string, unknown>
}

export interface ConsignmentGoodsBlock {
  consignment: Record<string, unknown>
  good_consignments: GoodConsignmentLine[]
}

export interface InvoiceConsignmentsGoodsPayload {
  status: boolean
  invoice_no?: string
  bill_id?: number
  consignments?: ConsignmentGoodsBlock[]
  message?: string
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v)
  }
  return '—'
}

function containerLabel(container: unknown): string {
  if (!container || typeof container !== 'object') return '—'
  const c = container as Record<string, unknown>
  const no = c.container_no ?? c.container_number
  const line = c.shipping_line
  if (no && line) return `${str(line)} · ${str(no)}`
  if (no) return str(no)
  return str(c.id)
}

export interface InvoiceConsignmentsGoodsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Torchlight / CMTS invoice number (bill_no) */
  invoiceNo: string | null
  /** Optional title override */
  title?: string
}

/**
 * Loads CMTS consignments and linked goods for an invoice number.
 * Reuse anywhere you have an `invoice_number` (invoices list, customer detail, etc.).
 */
export function InvoiceConsignmentsGoodsModal({
  open,
  onOpenChange,
  invoiceNo,
  title = 'Consignment & goods',
}: InvoiceConsignmentsGoodsModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [payload, setPayload] = useState<InvoiceConsignmentsGoodsPayload | null>(null)

  useEffect(() => {
    if (!open || !invoiceNo?.trim()) {
      setPayload(null)
      setLoadError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setPayload(null)

    invoiceApi
      .getInvoiceConsignmentsGoods(invoiceNo.trim())
      .then((data: InvoiceConsignmentsGoodsPayload) => {
        if (cancelled) return
        if (!data?.status) {
          setLoadError(
            typeof data?.message === 'string' ? data.message : 'Could not load consignment details'
          )
          return
        }
        setPayload(data)
      })
      .catch((e: { response?: { data?: { message?: string } }; message?: string }) => {
        if (cancelled) return
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          'Failed to load consignment and goods from CMTS'
        setLoadError(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, invoiceNo])

  const blocks = payload?.consignments ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Package className='h-5 w-5' />
            {title}
          </DialogTitle>
          <DialogDescription>
            {invoiceNo
              ? `Invoice ${invoiceNo} — consignments and goods linked in CMTS`
              : 'No invoice selected'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className='flex items-center justify-center gap-2 py-12 text-muted-foreground'>
            <Loader2 className='h-6 w-6 animate-spin' />
            Loading…
          </div>
        )}

        {!loading && loadError && (
          <Alert variant='destructive'>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {!loading && !loadError && payload && (
          <div className='space-y-4'>
            <div className='text-sm text-muted-foreground'>
              {payload.invoice_no && (
                <span className='mr-3'>
                  <span className='font-medium text-foreground'>CMTS invoice:</span> {payload.invoice_no}
                </span>
              )}
              {payload.bill_id != null && (
                <span>
                  <span className='font-medium text-foreground'>Bill ID:</span> {payload.bill_id}
                </span>
              )}
            </div>

            {blocks.length === 0 && (
              <p className='text-sm text-muted-foreground py-4'>
                {payload.message || 'No consignments linked to this invoice.'}
              </p>
            )}

            {blocks.map((block, idx) => {
              const c = block.consignment || {}
              const lines = block.good_consignments || []
              return (
                <Card key={str(c.id) || idx}>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-base'>
                      Consignment #{str(c.id)} — {str(c.tracking_number)}
                    </CardTitle>
                    <CardDescription className='space-y-1'>
                      <div>{str(c.name)}</div>
                      <div>
                        <span className='font-medium text-foreground'>Customer:</span>{' '}
                        {str(c.customer_full_name)}
                      </div>
                      <div>
                        <span className='font-medium text-foreground'>Container:</span>{' '}
                        {containerLabel(c.container)}
                      </div>
                      <div className='flex flex-wrap gap-x-4 gap-y-1'>
                        <span>
                          <span className='font-medium text-foreground'>CBM:</span> {str(c.cbm)}
                        </span>
                        <span>
                          <span className='font-medium text-foreground'>Pkgs:</span> {str(c.pkgs)}
                        </span>
                        <span>
                          <span className='font-medium text-foreground'>Currency:</span> {str(c.currency)}
                        </span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {lines.length === 0 ? (
                      <p className='text-sm text-muted-foreground'>No goods on this consignment.</p>
                    ) : (
                      <div className='rounded-md border'>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Good</TableHead>
                              <TableHead className='text-right'>Qty (line)</TableHead>
                              <TableHead className='text-right'>Pkgs (line)</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Qty (good)</TableHead>
                              <TableHead>Pkgs (good)</TableHead>
                              <TableHead>Supplier</TableHead>
                              <TableHead>Receipt #</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((row) => {
                              const g = row.good || {}
                              return (
                                <TableRow key={row.id}>
                                  <TableCell className='font-medium max-w-[180px] truncate' title={str(g.name)}>
                                    {str(g.name)}
                                  </TableCell>
                                  <TableCell className='text-right'>{str(row.quantity)}</TableCell>
                                  <TableCell className='text-right'>{str(row.pkgs)}</TableCell>
                                  <TableCell>{str(row.unit)}</TableCell>
                                  <TableCell className='text-sm'>{str(g.quantity)}</TableCell>
                                  <TableCell className='text-sm'>{str(g.pkgs)}</TableCell>
                                  <TableCell className='text-sm max-w-[120px] truncate' title={str(g.supplier_name)}>
                                    {str(g.supplier_name)}
                                  </TableCell>
                                  <TableCell className='text-sm'>{str(g.supplier_receipt_no)}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
