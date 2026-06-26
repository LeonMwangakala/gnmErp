import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  buildReportSheetRows,
  downloadReportWorkbook,
  reportDateRangeLabel,
} from '@/lib/report-excel-export'

function formatAmount(val: number): string {
  if (!Number.isFinite(val)) return '—'
  return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function sumNumeric<T>(rows: T[], key: keyof T): number {
  return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)
}

function ReportTotalRow({
  colSpan,
  label,
  cells,
}: {
  colSpan: number
  label: string
  cells: Array<string | number>
}) {
  return (
    <TableRow className='bg-muted/50 font-semibold hover:bg-muted/50'>
      <TableCell />
      <TableCell colSpan={colSpan}>{label}</TableCell>
      {cells.map((cell, index) => (
        <TableCell key={`${label}-${index}`} className='text-right tabular-nums'>
          {typeof cell === 'number' ? (Number.isInteger(cell) ? cell : formatAmount(cell)) : cell}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function downloadCustomerShippingReportExcel(data: CustomerShippingReportData) {
  const reportTitle = 'Customer Shipping Activity Report'
  const dateRange = reportDateRangeLabel(data.date_from, data.date_to)
  const headers = [
    'S/N',
    'Customer',
    'Phone',
    'Registered',
    'Goods in period',
    'Consignments in period',
    'Total goods',
    'Last shipment',
    'Days since last',
    'Observation',
  ]

  const sections: Array<{ label: string; rows: CustomerShippingReportRow[] }> = [
    { label: 'New customers', rows: data.new_customers },
    { label: 'Active customers', rows: data.active_customers },
    { label: 'Exited customers', rows: data.exited_customers },
  ]

  const sheetsWithTotals = sections.map((section) => {
    const dataRows = section.rows.map((row, index) => [
      index + 1,
      row.full_name,
      row.cellphone ?? '',
      row.registered_at,
      row.goods_in_period,
      row.consignments_in_period,
      row.total_goods,
      row.last_shipment_date ?? '',
      row.days_since_last_shipment ?? '',
      row.observation,
    ])
    if (section.rows.length) {
      dataRows.push([
        '',
        'Total',
        '',
        '',
        sumNumeric(section.rows, 'goods_in_period'),
        sumNumeric(section.rows, 'consignments_in_period'),
        sumNumeric(section.rows, 'total_goods'),
        '',
        '',
        '',
      ])
    }
    return {
      name: section.label,
      rows: buildReportSheetRows(
        `${reportTitle} — ${section.label}`,
        dateRange,
        headers,
        dataRows
      ),
    }
  })

  downloadReportWorkbook(
    `customer-shipping-activity-${data.date_from}-to-${data.date_to}.xlsx`,
    sheetsWithTotals
  )
}

export function downloadVehicleCollectionReportExcel(data: VehicleCollectionReportData) {
  const reportTitle = 'Vehicle Collection Report'
  const dateRange = reportDateRangeLabel(data.date_from, data.date_to)
  const totalLabel = 'Total'

  const collectionHeaders = ['S/N', 'Plate number', 'Trips', 'Total collected', 'Total expenses']
  const collectionRows = data.collection.map((r, index) => [
    index + 1,
    r.plate_number,
    r.trip_count,
    r.total_collected,
    r.total_expenses,
  ])
  if (data.collection.length) {
    collectionRows.push([
      '',
      totalLabel,
      data.summary.total_trips,
      data.summary.total_collected,
      data.summary.total_expenses,
    ])
  }

  const driverHeaders = [
    'S/N',
    'Driver',
    'Driver code',
    'Phone',
    'Trips',
    'Total collected',
    'Total expenses',
  ]
  const driverRows = data.driver_collection.map((r, index) => [
    index + 1,
    r.driver_name,
    r.driver_code,
    r.phone_number,
    r.trip_count,
    r.total_collected,
    r.total_expenses,
  ])

  if (data.driver_collection.length) {
    driverRows.push([
      '',
      totalLabel,
      '',
      '',
      sumNumeric(data.driver_collection, 'trip_count'),
      sumNumeric(data.driver_collection, 'total_collected'),
      sumNumeric(data.driver_collection, 'total_expenses'),
    ])
  }

  const tripHeaders = [
    'S/N',
    'Trip number',
    'Plate number',
    'Driver',
    'Route',
    'Dispatch date',
    'Status',
    'Charge',
    'Trip expenses',
  ]
  const tripRows = data.trips.map((r, index) => [
    index + 1,
    r.trip_number,
    r.plate_number,
    r.driver_name,
    r.route_label ?? '',
    r.dispatch_date ?? '',
    r.trip_status,
    r.transportation_charge,
    r.total_expenses,
  ])
  if (data.trips.length) {
    tripRows.push([
      '',
      totalLabel,
      '',
      '',
      '',
      '',
      '',
      sumNumeric(data.trips, 'transportation_charge'),
      sumNumeric(data.trips, 'total_expenses'),
    ])
  }

  const expenseHeaders = [
    'S/N',
    'Plate number',
    'Trip number',
    'Type',
    'Date',
    'Amount',
    'Vendor',
    'Notes',
  ]
  const expenseRows = data.expenses.map((r, index) => [
    index + 1,
    r.plate_number,
    r.trip_number,
    r.expense_type,
    r.expense_date ?? '',
    r.amount,
    r.vendor,
    r.notes,
  ])
  if (data.expenses.length) {
    expenseRows.push([
      '',
      totalLabel,
      '',
      '',
      '',
      sumNumeric(data.expenses, 'amount'),
      '',
      '',
    ])
  }

  const sheets = [
    {
      name: 'Daily collection',
      rows: buildReportSheetRows(
        `${reportTitle} — Daily collection`,
        dateRange,
        collectionHeaders,
        collectionRows
      ),
    },
    {
      name: 'Driver collection',
      rows: buildReportSheetRows(
        `${reportTitle} — Driver collection`,
        dateRange,
        driverHeaders,
        driverRows
      ),
    },
    {
      name: 'Trips',
      rows: buildReportSheetRows(`${reportTitle} — Trips`, dateRange, tripHeaders, tripRows),
    },
    {
      name: 'Expenses',
      rows: buildReportSheetRows(
        `${reportTitle} — Expenses`,
        dateRange,
        expenseHeaders,
        expenseRows
      ),
    },
  ]

  downloadReportWorkbook(
    `vehicle-collection-report-${data.date_from}-to-${data.date_to}.xlsx`,
    sheets
  )
}

function CustomerShippingTable({ rows }: { rows: CustomerShippingReportRow[] }) {
  if (!rows.length) {
    return <p className='text-muted-foreground py-4 text-sm text-center'>No rows in this section.</p>
  }

  const goodsTotal = sumNumeric(rows, 'goods_in_period')
  const consignmentsTotal = sumNumeric(rows, 'consignments_in_period')
  const totalGoodsTotal = sumNumeric(rows, 'total_goods')

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-12'>S/N</TableHead>
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
        {rows.map((r, index) => (
          <TableRow key={`${r.customer_id}-${r.full_name}`}>
            <TableCell>{index + 1}</TableCell>
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
        <ReportTotalRow
          colSpan={3}
          label='Total'
          cells={[goodsTotal, consignmentsTotal, totalGoodsTotal, '', '']}
        />
      </TableBody>
    </Table>
  )
}

function CustomerShippingSummaryPanel({ data }: { data: CustomerShippingReportData }) {
  const stats = [
    { label: 'New customers', value: data.summary.new_count },
    { label: 'Active customers', value: data.summary.active_count },
    { label: 'Exited customers', value: data.summary.exited_count },
    { label: 'Goods receipts in period', value: data.summary.goods_receipts_in_period },
  ]

  return (
    <div className='border-t pt-4'>
      <h3 className='mb-3 text-sm font-semibold'>Report summary</h3>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {stats.map((stat) => (
          <Card key={stat.label} className='shadow-none'>
            <CardContent className='p-4'>
              <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
                {stat.label}
              </p>
              <p className='mt-1 text-2xl font-semibold tabular-nums'>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {data.observations.length ? (
        <div className='bg-muted/40 mt-4 rounded-lg border p-4'>
          <p className='mb-2 text-sm font-medium'>Observations</p>
          <ul className='text-muted-foreground list-disc space-y-1.5 ps-5 text-sm'>
            {data.observations.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
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
          {data ? (
            <p className='text-muted-foreground pt-1 text-sm font-normal'>
              {data.date_from} – {data.date_to}
            </p>
          ) : null}
        </DialogHeader>
        {data ? (
          <>
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
            <div className='mt-4 shrink-0'>
              <CustomerShippingSummaryPanel data={data} />
            </div>
            <DialogFooter className='mt-4 shrink-0 border-t pt-4'>
              <Button type='button' size='sm' onClick={() => downloadCustomerShippingReportExcel(data)}>
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
                        <>
                          {data.collection.map((r, index) => (
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
                          ))}
                          <ReportTotalRow
                            colSpan={1}
                            label='Total'
                            cells={[
                              data.summary.total_trips,
                              data.summary.total_collected,
                              data.summary.total_expenses,
                            ]}
                          />
                        </>
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
                        <>
                          {data.driver_collection.map((r, index) => (
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
                          ))}
                          <ReportTotalRow
                            colSpan={3}
                            label='Total'
                            cells={[
                              data.summary.total_trips,
                              data.summary.total_collected,
                              sumNumeric(data.driver_collection, 'total_expenses'),
                            ]}
                          />
                        </>
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
                        <>
                          {data.trips.map((r, index) => (
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
                          ))}
                          <ReportTotalRow
                            colSpan={6}
                            label='Total'
                            cells={[
                              sumNumeric(data.trips, 'transportation_charge'),
                              sumNumeric(data.trips, 'total_expenses'),
                            ]}
                          />
                        </>
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
                        <>
                          {data.expenses.map((r, index) => (
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
                          ))}
                          <ReportTotalRow
                            colSpan={4}
                            label='Total'
                            cells={[sumNumeric(data.expenses, 'amount'), '', '']}
                          />
                        </>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </div>
            </Tabs>
            <DialogFooter className='mt-4 shrink-0 border-t pt-4'>
              <Button type='button' size='sm' onClick={() => downloadVehicleCollectionReportExcel(data)}>
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
