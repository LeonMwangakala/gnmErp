import { useState, useCallback, useRef } from 'react'
import AsyncSelect from 'react-select/async'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { customerApi } from '@/lib/api'
import { ContainerPaymentReportPanel } from './container-payment-report'

interface CustomerOption {
  id: number
  value: string
  label: string
  name: string
  email: string
}

type ReportType =
  | 'invoice'
  | 'invoice-payments'
  | 'petty-cash'
  | 'expense-payments'
  | 'container-payments'

interface ReportDefinition {
  key: ReportType
  title: string
  description: string
}

const REPORTS: ReportDefinition[] = [
  {
    key: 'invoice',
    title: 'Invoice report',
    description: 'Filter invoices by date range, status and customer.',
  },
  {
    key: 'invoice-payments',
    title: 'Invoice payments report',
    description: 'Filter invoice payments by date, user, customer and invoice.',
  },
  {
    key: 'petty-cash',
    title: 'Petty cash report',
    description: 'Filter petty cash expenses by date, category and receiver.',
  },
  {
    key: 'expense-payments',
    title: 'Expense payments report',
    description: 'Filter expense payments by date, vendor, account and category.',
  },
  {
    key: 'container-payments',
    title: 'Container payment report',
    description:
      'Enter a container number to list invoice payments for that container, then export to Excel.',
  },
]

type CommonFilters = {
  dateRange: string
}

type InvoiceFilters = CommonFilters & {
  status: 'all' | 'unpaid' | 'partial' | 'paid'
  customerId: string
}

type InvoicePaymentFilters = CommonFilters & {
  userId: string
  customerId: string
  invoiceId: string
}

type PettyCashFilters = CommonFilters & {
  categoryId: string
  receiverFor: 'all' | 'employee' | 'vendor' | 'other'
}

type ExpensePaymentFilters = CommonFilters & {
  vendorId: string
  accountId: string
  categoryId: string
}

type ReportFilters =
  | InvoiceFilters
  | InvoicePaymentFilters
  | PettyCashFilters
  | ExpensePaymentFilters
  | CommonFilters

export function Reports() {
  const [open, setOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null)
  const [filters, setFilters] = useState<ReportFilters | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedInvoiceCustomer, setSelectedInvoiceCustomer] = useState<CustomerOption | null>(null)
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<CustomerOption | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadCustomerOptions = useCallback(async (inputValue: string): Promise<CustomerOption[]> => {
    if (!inputValue || inputValue.length < 2) {
      return []
    }
    try {
      const customers = await customerApi.searchCustomers(inputValue, 20)
      return customers.map((customer: any) => ({
        id: customer.id,
        value: String(customer.id),
        label: customer.label || customer.name || customer.customer_name || 'Unknown',
        name: customer.name || customer.customer_name || 'Unknown',
        email: customer.email || '',
      }))
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to search customers:', error)
      return []
    }
  }, [])

  const loadCustomerOptionsDebounced = useCallback(
    (inputValue: string, callback: (options: CustomerOption[]) => void) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      debounceTimeoutRef.current = setTimeout(async () => {
        const options = await loadCustomerOptions(inputValue)
        callback(options)
      }, 300)
    },
    [loadCustomerOptions]
  )

  const handleOpenReport = (report: ReportDefinition) => {
    setSelectedReport(report)
    setFilters(getInitialFilters(report.key))
    setSelectedInvoiceCustomer(null)
    setSelectedPaymentCustomer(null)
    setOpen(true)
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => (prev ? ({ ...prev, [field]: value } as ReportFilters) : prev))
  }

  const getInitialFilters = (type: ReportType): ReportFilters => {
    const base: CommonFilters = { dateRange: '' }
    switch (type) {
      case 'invoice':
        return {
          ...base,
          status: 'all',
          customerId: '',
        }
      case 'invoice-payments':
        return {
          ...base,
          userId: '',
          customerId: '',
          invoiceId: '',
        }
      case 'petty-cash':
        return {
          ...base,
          categoryId: '',
          receiverFor: 'all',
        }
      case 'expense-payments':
        return {
          ...base,
          vendorId: '',
          accountId: '',
          categoryId: '',
        }
      case 'container-payments':
        return base
    }
  }

  const handleDownload = async (type: 'pdf' | 'excel') => {
    if (!selectedReport || !filters || selectedReport.key === 'container-payments') return
    try {
      setIsDownloading(true)
      // TODO: Implement backend endpoints for each report type, e.g.:
      // - GET /reports/invoices?format=pdf&...
      // For now we just log the intended payload.
      // eslint-disable-next-line no-console
      console.log('Download report', {
        type: selectedReport.key,
        format: type,
        filters,
      })
      // Placeholder: later replace with window.open or file download logic.
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {REPORTS.map((report) => (
          <Card
            key={report.key}
            className='flex flex-col justify-between border-dashed hover:border-primary/70 cursor-pointer transition-colors'
            onClick={() => handleOpenReport(report)}
          >
            <CardHeader>
              <div className='flex items-center justify-between gap-2'>
                <CardTitle className='text-base font-semibold flex items-center gap-2'>
                  <FileText className='h-4 w-4 text-muted-foreground' />
                  {report.title}
                </CardTitle>
              </div>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant='outline' size='sm'>
                Configure &amp; download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={
            selectedReport?.key === 'container-payments'
              ? 'max-w-5xl w-[95vw] max-h-[90vh] flex flex-col gap-0 overflow-hidden'
              : undefined
          }
        >
          <DialogHeader>
            <DialogTitle>
              {selectedReport?.key === 'container-payments'
                ? 'Container payment report'
                : selectedReport
                  ? `${selectedReport.title} filters`
                  : 'Report filters'}
            </DialogTitle>
          </DialogHeader>

          {selectedReport?.key === 'container-payments' ? (
            <div className='overflow-y-auto pr-1 -mr-1 min-h-0'>
              <ContainerPaymentReportPanel />
            </div>
          ) : null}

          {filters && selectedReport?.key !== 'container-payments' && (
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='dateRange'>Date range</Label>
                <Input
                  id='dateRange'
                  placeholder='YYYY-MM-DD to YYYY-MM-DD (optional)'
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                />
              </div>

              {selectedReport?.key === 'invoice' && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='invoiceStatus'>Status</Label>
                    <Select
                      value={(filters as InvoiceFilters).status}
                      onValueChange={(value) =>
                        handleFilterChange('status', value as InvoiceFilters['status'])
                      }
                    >
                      <SelectTrigger id='invoiceStatus'>
                        <SelectValue placeholder='All statuses' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All</SelectItem>
                        <SelectItem value='unpaid'>Unpaid</SelectItem>
                        <SelectItem value='partial'>Partial paid</SelectItem>
                        <SelectItem value='paid'>Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='invoiceCustomer'>Customer (optional)</Label>
                    <AsyncSelect<CustomerOption>
                      value={selectedInvoiceCustomer}
                      onChange={(selected) => {
                        setSelectedInvoiceCustomer(selected)
                        handleFilterChange('customerId', selected ? String(selected.id) : '')
                      }}
                      loadOptions={loadCustomerOptionsDebounced}
                      placeholder='Type customer name or email...'
                      isClearable
                      isSearchable
                      noOptionsMessage={({ inputValue }) =>
                        inputValue.length < 2
                          ? 'Type at least 2 characters to search'
                          : 'No customers found'
                      }
                      loadingMessage={() => 'Searching customers...'}
                      className='react-select-container'
                      classNamePrefix='react-select'
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: '36px',
                          height: '36px',
                          borderColor: state.isFocused
                            ? 'hsl(var(--ring))'
                            : 'hsl(var(--input))',
                          backgroundColor: 'transparent',
                          borderRadius: 'calc(var(--radius) - 2px)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          boxShadow: state.isFocused
                            ? '0 0 0 3px hsl(var(--ring) / 0.5)'
                            : 'none',
                          '&:hover': {
                            borderColor: 'hsl(var(--ring))',
                          },
                        }),
                        input: (base) => ({
                          ...base,
                          margin: 0,
                          padding: 0,
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          padding: '0 8px',
                          height: '36px',
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: 'hsl(var(--foreground))',
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: 'hsl(var(--muted-foreground))',
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'calc(var(--radius) - 2px)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? 'hsl(var(--accent))'
                            : 'transparent',
                          color: 'hsl(var(--foreground))',
                          '&:active': {
                            backgroundColor: 'hsl(var(--accent))',
                          },
                        }),
                      }}
                    />
                  </div>
                </>
              )}

              {selectedReport?.key === 'invoice-payments' && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='paymentUser'>User (created by, optional ID)</Label>
                    <Input
                      id='paymentUser'
                      placeholder='User ID'
                      value={(filters as InvoicePaymentFilters).userId}
                      onChange={(e) => handleFilterChange('userId', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='paymentCustomer'>Customer (optional)</Label>
                    <AsyncSelect<CustomerOption>
                      value={selectedPaymentCustomer}
                      onChange={(selected) => {
                        setSelectedPaymentCustomer(selected)
                        handleFilterChange('customerId', selected ? String(selected.id) : '')
                      }}
                      loadOptions={loadCustomerOptionsDebounced}
                      placeholder='Type customer name or email...'
                      isClearable
                      isSearchable
                      noOptionsMessage={({ inputValue }) =>
                        inputValue.length < 2
                          ? 'Type at least 2 characters to search'
                          : 'No customers found'
                      }
                      loadingMessage={() => 'Searching customers...'}
                      className='react-select-container'
                      classNamePrefix='react-select'
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: '36px',
                          height: '36px',
                          borderColor: state.isFocused
                            ? 'hsl(var(--ring))'
                            : 'hsl(var(--input))',
                          backgroundColor: 'transparent',
                          borderRadius: 'calc(var(--radius) - 2px)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          boxShadow: state.isFocused
                            ? '0 0 0 3px hsl(var(--ring) / 0.5)'
                            : 'none',
                          '&:hover': {
                            borderColor: 'hsl(var(--ring))',
                          },
                        }),
                        input: (base) => ({
                          ...base,
                          margin: 0,
                          padding: 0,
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          padding: '0 8px',
                          height: '36px',
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: 'hsl(var(--foreground))',
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: 'hsl(var(--muted-foreground))',
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'calc(var(--radius) - 2px)',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? 'hsl(var(--accent))'
                            : 'transparent',
                          color: 'hsl(var(--foreground))',
                          '&:active': {
                            backgroundColor: 'hsl(var(--accent))',
                          },
                        }),
                      }}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='paymentInvoice'>Invoice (optional ID)</Label>
                    <Input
                      id='paymentInvoice'
                      placeholder='Invoice ID'
                      value={(filters as InvoicePaymentFilters).invoiceId}
                      onChange={(e) => handleFilterChange('invoiceId', e.target.value)}
                    />
                  </div>
                </>
              )}

              {selectedReport?.key === 'petty-cash' && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='pettyCategory'>Category (optional ID)</Label>
                    <Input
                      id='pettyCategory'
                      placeholder='Category ID'
                      value={(filters as PettyCashFilters).categoryId}
                      onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='receiverFor'>Receiver type</Label>
                    <Select
                      value={(filters as PettyCashFilters).receiverFor}
                      onValueChange={(value) =>
                        handleFilterChange('receiverFor', value as PettyCashFilters['receiverFor'])
                      }
                    >
                      <SelectTrigger id='receiverFor'>
                        <SelectValue placeholder='All' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>All</SelectItem>
                        <SelectItem value='employee'>Employee</SelectItem>
                        <SelectItem value='vendor'>Vendor</SelectItem>
                        <SelectItem value='other'>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedReport?.key === 'expense-payments' && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='expenseVendor'>Vendor (optional ID)</Label>
                    <Input
                      id='expenseVendor'
                      placeholder='Vendor ID'
                      value={(filters as ExpensePaymentFilters).vendorId}
                      onChange={(e) => handleFilterChange('vendorId', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='expenseAccount'>Account (optional ID)</Label>
                    <Input
                      id='expenseAccount'
                      placeholder='Account ID'
                      value={(filters as ExpensePaymentFilters).accountId}
                      onChange={(e) => handleFilterChange('accountId', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='expenseCategory'>Category (optional ID)</Label>
                    <Input
                      id='expenseCategory'
                      placeholder='Category ID'
                      value={(filters as ExpensePaymentFilters).categoryId}
                      onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {selectedReport?.key !== 'container-payments' ? (
            <DialogFooter className='mt-4 flex-row justify-between gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  if (selectedReport) {
                    setFilters(getInitialFilters(selectedReport.key))
                    setSelectedInvoiceCustomer(null)
                    setSelectedPaymentCustomer(null)
                  }
                }}
              >
                Reset filters
              </Button>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={isDownloading}
                  onClick={() => void handleDownload('pdf')}
                >
                  <Download className='mr-2 h-4 w-4' />
                  PDF
                </Button>
                <Button
                  type='button'
                  size='sm'
                  disabled={isDownloading}
                  onClick={() => void handleDownload('excel')}
                >
                  <Download className='mr-2 h-4 w-4' />
                  Excel
                </Button>
              </div>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

