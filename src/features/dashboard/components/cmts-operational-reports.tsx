import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  CustomerShippingReportData,
  CustomerShippingReportRow,
  VehicleCollectionReportData,
} from '@/lib/api'

function escapeCsvCell(val: string | number | null | undefined): string {
  const s = String(val ?? '')
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function formatAmount(val: number): string {
  if (!Number.isFinite(val)) return '—'
  return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function csvHeadingWithDates(label: string, dateFrom: string, dateTo: string): string {
  return `${label} (From: ${dateFrom}, To: ${dateTo})`
}

export function downloadCustomerShippingReportCsv(data: CustomerShippingReportData) {
  const lines: string[] = [
    csvHeadingWithDates('Customer Shipping Activity Report', data.date_from, data.date_to),
    '',
    [
      'Section',
      'Customer',
      'Phone',
      'Registered',
      'Goods in period',
      'Consignments in period',
      'Total goods',
      'Last shipment',
      'Days since last',
      'Observation',
    ].join(','),
  ]

  const sections: Array<{ label: string; rows: CustomerShippingReportRow[] }> = [
    { label: 'New customers', rows: data.new_customers },
    { label: 'Active customers', rows: data.active_customers },
    { label: 'Exited customers', rows: data.exited_customers },
  ]

  for (const section of sections) {
    for (const row of section.rows) {
      lines.push(
        [
          escapeCsvCell(section.label),
          escapeCsvCell(row.full_name),
          escapeCsvCell(row.cellphone),
          escapeCsvCell(row.registered_at),
          escapeCsvCell(row.goods_in_period),
          escapeCsvCell(row.consignments_in_period),
          escapeCsvCell(row.total_goods),
          escapeCsvCell(row.last_shipment_date),
          escapeCsvCell(row.days_since_last_shipment ?? ''),
          escapeCsvCell(row.observation),
        ].join(',')
      )
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `customer-shipping-activity-${data.date_from}-to-${data.date_to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadVehicleCollectionReportCsv(data: VehicleCollectionReportData) {
  const lines: string[] = []
  const sn = 'S/N'
  const totalLabel = 'Total'

  lines.push(csvHeadingWithDates('Daily collection', data.date_from, data.date_to))
  lines.push([sn, 'Plate number', 'Trips', 'Total collected', 'Total expenses'].join(','))
  data.collection.forEach((r, index) => {
    lines.push(
      [
        escapeCsvCell(index + 1),
        escapeCsvCell(r.plate_number),
        escapeCsvCell(r.trip_count),
        escapeCsvCell(r.total_collected),
        escapeCsvCell(r.total_expenses),
      ].join(',')
    )
  })
  if (data.collection.length) {
    lines.push(
      [
        '',
        escapeCsvCell(totalLabel),
        escapeCsvCell(data.summary.total_trips),
        escapeCsvCell(data.summary.total_collected),
        escapeCsvCell(data.summary.total_expenses),
      ].join(',')
    )
  }

  lines.push('')
  lines.push(csvHeadingWithDates('Driver collection', data.date_from, data.date_to))
  lines.push(
    [sn, 'Driver', 'Driver code', 'Phone', 'Trips', 'Total collected', 'Total expenses'].join(',')
  )
  data.driver_collection.forEach((r, index) => {
    lines.push(
      [
        escapeCsvCell(index + 1),
        escapeCsvCell(r.driver_name),
        escapeCsvCell(r.driver_code),
        escapeCsvCell(r.phone_number),
        escapeCsvCell(r.trip_count),
        escapeCsvCell(r.total_collected),
        escapeCsvCell(r.total_expenses),
      ].join(',')
    )
  })

  lines.push('')
  lines.push(csvHeadingWithDates('Trips', data.date_from, data.date_to))
  lines.push(
    [
      sn,
      'Trip number',
      'Plate number',
      'Driver',
      'Route',
      'Dispatch date',
      'Status',
      'Charge',
      'Trip expenses',
    ].join(',')
  )
  data.trips.forEach((r, index) => {
    lines.push(
      [
        escapeCsvCell(index + 1),
        escapeCsvCell(r.trip_number),
        escapeCsvCell(r.plate_number),
        escapeCsvCell(r.driver_name),
        escapeCsvCell(r.route_label),
        escapeCsvCell(r.dispatch_date),
        escapeCsvCell(r.trip_status),
        escapeCsvCell(r.transportation_charge),
        escapeCsvCell(r.total_expenses),
      ].join(',')
    )
  })

  lines.push('')
  lines.push(csvHeadingWithDates('Expenses', data.date_from, data.date_to))
  lines.push(
    [sn, 'Plate number', 'Trip number', 'Type', 'Date', 'Amount', 'Vendor', 'Notes'].join(',')
  )
  data.expenses.forEach((r, index) => {
    lines.push(
      [
        escapeCsvCell(index + 1),
        escapeCsvCell(r.plate_number),
        escapeCsvCell(r.trip_number),
        escapeCsvCell(r.expense_type),
        escapeCsvCell(r.expense_date),
        escapeCsvCell(r.amount),
        escapeCsvCell(r.vendor),
        escapeCsvCell(r.notes),
      ].join(',')
    )
  })

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vehicle-collection-report-${data.date_from}-to-${data.date_to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function CustomerShippingTable({ rows }: { rows: CustomerShippingReportRow[] }) {
  if (!rows.length) {
    return <p className='text-muted-foreground py-4 text-sm text-center'>No rows in this section.</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Registered</TableHead>
          <TableHead className='text-right'>Goods</TableHead>
          <TableHead className='text-right'>Consignments</TableHead>
          <TableHead className='text-right'>Total goods</TableHead>
          <TableHead>Last shipment</TableHead>
          <TableHead className='min-w-[220px]'>Observation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={`${r.customer_id}-${r.full_name}`}>
            <TableCell>{r.full_name || '—'}</TableCell>
            <TableCell>{r.cellphone || '—'}</TableCell>
            <TableCell className='tabular-nums'>{r.registered_at || '—'}</TableCell>
            <TableCell className='text-right tabular-nums'>{r.goods_in_period}</TableCell>
            <TableCell className='text-right tabular-nums'>{r.consignments_in_period}</TableCell>
            <TableCell className='text-right tabular-nums'>{r.total_goods}</TableCell>
            <TableCell className='tabular-nums'>{r.last_shipment_date || '—'}</TableCell>
            <TableCell className='whitespace-normal text-sm'>{r.observation}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function CustomerShippingReportDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: CustomerShippingReportData | null
}) {
  const [tab, setTab] = useState<'new' | 'active' | 'exited'>('new')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[min(90vh,800px)] w-[min(1400px,98vw)] max-w-[min(1400px,98vw)] flex-col gap-0 overflow-hidden sm:max-w-[min(1400px,98vw)]'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>Customer Shipping Activity Report</DialogTitle>
        </DialogHeader>
        {data ? (
          <>
            <p className='text-muted-foreground shrink-0 pb-2 text-sm'>
              {data.date_from} – {data.date_to} · New {data.summary.new_count} · Active{' '}
              {data.summary.active_count} · Exited {data.summary.exited_count} · Goods receipts{' '}
              {data.summary.goods_receipts_in_period}
            </p>
            {data.observations.length ? (
              <ul className='text-muted-foreground mb-2 shrink-0 list-disc space-y-1 ps-5 text-xs'>
                {data.observations.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className='min-h-0 flex-1'>
              <TabsList className='shrink-0'>
                <TabsTrigger value='new'>New ({data.summary.new_count})</TabsTrigger>
                <TabsTrigger value='active'>Active ({data.summary.active_count})</TabsTrigger>
                <TabsTrigger value='exited'>Exited ({data.summary.exited_count})</TabsTrigger>
              </TabsList>
              <div className='min-h-0 flex-1 overflow-auto pt-3'>
                <TabsContent value='new' className='mt-0'>
                  <CustomerShippingTable rows={data.new_customers} />
                </TabsContent>
                <TabsContent value='active' className='mt-0'>
                  <CustomerShippingTable rows={data.active_customers} />
                </TabsContent>
                <TabsContent value='exited' className='mt-0'>
                  <CustomerShippingTable rows={data.exited_customers} />
                </TabsContent>
              </div>
            </Tabs>
            <DialogFooter className='mt-4 shrink-0 border-t pt-4'>
              <Button type='button' size='sm' onClick={() => downloadCustomerShippingReportCsv(data)}>
                <Download className='mr-2 h-4 w-4' />
                Excel
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function VehicleCollectionReportDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: VehicleCollectionReportData | null
}) {
  const [tab, setTab] = useState<'collection' | 'drivers' | 'trips' | 'expenses'>('collection')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[min(90vh,800px)] w-[min(1400px,98vw)] max-w-[min(1400px,98vw)] flex-col gap-0 overflow-hidden sm:max-w-[min(1400px,98vw)]'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>Vehicle Collection Report</DialogTitle>
        </DialogHeader>
        {data ? (
          <>
            <p className='text-muted-foreground shrink-0 pb-2 text-sm'>
              {data.date_from} – {data.date_to} · Vehicles {data.summary.vehicle_count} · Drivers{' '}
              {data.summary.driver_count} · Trips {data.summary.total_trips} · Collected{' '}
              {formatAmount(data.summary.total_collected)} · Expenses{' '}
              {formatAmount(data.summary.total_expenses)}
            </p>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className='min-h-0 flex-1'>
              <TabsList className='shrink-0 flex-wrap'>
                <TabsTrigger value='collection'>Daily collection</TabsTrigger>
                <TabsTrigger value='drivers'>Driver collection</TabsTrigger>
                <TabsTrigger value='trips'>Trips</TabsTrigger>
                <TabsTrigger value='expenses'>Expenses</TabsTrigger>
              </TabsList>
              <div className='min-h-0 flex-1 overflow-auto pt-3'>
                <TabsContent value='collection' className='mt-0'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-12'>S/N</TableHead>
                        <TableHead>Plate</TableHead>
                        <TableHead className='text-right'>Trips</TableHead>
                        <TableHead className='text-right'>Collected</TableHead>
                        <TableHead className='text-right'>Expenses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.collection.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className='text-muted-foreground text-center'>
                            No vehicle collection rows.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.collection.map((r, index) => (
                          <TableRow key={r.vehicle_id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{r.plate_number || '—'}</TableCell>
                            <TableCell className='text-right tabular-nums'>{r.trip_count}</TableCell>
                            <TableCell className='text-right tabular-nums'>
                              {formatAmount(r.total_collected)}
                            </TableCell>
                            <TableCell className='text-right tabular-nums'>
                              {formatAmount(r.total_expenses)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value='drivers' className='mt-0'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-12'>S/N</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className='text-right'>Trips</TableHead>
                        <TableHead className='text-right'>Collected</TableHead>
                        <TableHead className='text-right'>Expenses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.driver_collection.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className='text-muted-foreground text-center'>
                            No driver collection rows.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.driver_collection.map((r, index) => (
                          <TableRow key={r.driver_id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{r.driver_name || '—'}</TableCell>
                            <TableCell>{r.driver_code || '—'}</TableCell>
                            <TableCell>{r.phone_number || '—'}</TableCell>
                            <TableCell className='text-right tabular-nums'>{r.trip_count}</TableCell>
                            <TableCell className='text-right tabular-nums'>
                              {formatAmount(r.total_collected)}
                            </TableCell>
                            <TableCell className='text-right tabular-nums'>
                              {formatAmount(r.total_expenses)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value='trips' className='mt-0'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-12'>S/N</TableHead>
                        <TableHead>Trip</TableHead>
                        <TableHead>Plate</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Dispatch</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Charge</TableHead>
                        <TableHead className='text-right'>Expenses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.trips.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className='text-muted-foreground text-center'>
                            No trips in this range.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.trips.map((r, index) => (
                          <TableRow key={r.trip_id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{r.trip_number || '—'}</TableCell>
                            <TableCell>{r.plate_number || '—'}</TableCell>
                            <TableCell>{r.driver_name || '—'}</TableCell>
                            <TableCell className='whitespace-normal'>{r.route_label || '—'}</TableCell>
                            <TableCell className='tabular-nums'>{r.dispatch_date || '—'}</TableCell>
                            <TableCell>{r.trip_status || '—'}</TableCell>
                            <TableCell className='text-right tabular-nums'>
                              {formatAmount(r.transportation_charge)}
                            </TableCell>
                            <TableCell className='text-right tabular-nums'>
                              {formatAmount(r.total_expenses)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value='expenses' className='mt-0'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-12'>S/N</TableHead>
                        <TableHead>Plate</TableHead>
                        <TableHead>Trip</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className='text-right'>Amount</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.expenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className='text-muted-foreground text-center'>
                            No expenses in this range.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.expenses.map((r, index) => (
                          <TableRow key={r.expense_id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{r.plate_number || '—'}</TableCell>
                            <TableCell>{r.trip_number || '—'}</TableCell>
                            <TableCell>{r.expense_type || '—'}</TableCell>
                            <TableCell className='tabular-nums'>{r.expense_date || '—'}</TableCell>
                            <TableCell className='text-right tabular-nums'>
                              {formatAmount(r.amount)}
                            </TableCell>
                            <TableCell>{r.vendor || '—'}</TableCell>
                            <TableCell className='whitespace-normal'>{r.notes || '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </div>
            </Tabs>
            <DialogFooter className='mt-4 shrink-0 border-t pt-4'>
              <Button type='button' size='sm' onClick={() => downloadVehicleCollectionReportCsv(data)}>
                <Download className='mr-2 h-4 w-4' />
                Excel
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
