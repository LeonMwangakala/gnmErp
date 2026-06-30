import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Download,
  Eye,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import {
  exportColumnsForTab,
  exportJobsCsv,
  exportJobsExcel,
  exportJobsPdf,
} from './jobs-export'
import {
  displayWorkflowStatus,
  EMPTY_JOB_FILTERS,
  formatDateTime,
  formatListDate,
  type JobListFilters,
  type JobListItem,
  type JobListSummary,
  type JobWorkflowStatus,
  type JobWorkflowTab,
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_TAB_LABELS,
  workflowStatusBadgeClass,
} from './job-workflow'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { customsJobApi } from '@/lib/api'

const PER_PAGE = 25

const EMPTY_SUMMARY: JobListSummary = {
  all: 0,
  discharged: 0,
  carrying: 0,
  arrived: 0,
  not_arrived: 0,
}

const WORKFLOW_TABS: JobWorkflowTab[] = [
  'all',
  'discharged',
  'carrying',
  'arrived',
  'not_arrived',
]

type SortState = {
  sort_by: string
  sort_dir: 'asc' | 'desc'
}

function SortableHead({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string
  column: string
  sort: SortState
  onSort: (column: string) => void
  className?: string
}) {
  const active = sort.sort_by === column
  const Icon = !active ? ArrowUpDown : sort.sort_dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead className={className}>
      <button
        type='button'
        className='inline-flex items-center gap-1 font-medium hover:text-foreground'
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className='h-3.5 w-3.5 text-muted-foreground' />
      </button>
    </TableHead>
  )
}

function StatusBadge({
  row,
  tab,
}: {
  row: JobListItem
  tab: JobWorkflowTab
}) {
  const label = displayWorkflowStatus(row.workflow_status, tab === 'not_arrived' ? 'not_arrived' : undefined)
  const className = workflowStatusBadgeClass(
    tab === 'not_arrived' ? 'NOT_ARRIVED' : row.workflow_status,
    tab === 'not_arrived' ? 'not_arrived' : undefined
  )
  return (
    <Badge variant='outline' className={className}>
      {label}
    </Badge>
  )
}

export function CustomsJobs() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<JobWorkflowTab>('all')
  const [filters, setFilters] = useState<JobListFilters>(EMPTY_JOB_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ sort_by: 'created_at', sort_dir: 'desc' })
  const [rows, setRows] = useState<JobListItem[]>([])
  const [summary, setSummary] = useState<JobListSummary>(EMPTY_SUMMARY)
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
    total: 0,
    from: null as number | null,
    to: null as number | null,
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<JobListItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statusTarget, setStatusTarget] = useState<JobListItem | null>(null)
  const [statusValue, setStatusValue] = useState<JobWorkflowStatus>('DISCHARGED')
  const [statusSaving, setStatusSaving] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput.trim() }))
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await customsJobApi.listJobs({
        tab: activeTab,
        page,
        per_page: PER_PAGE,
        sort_by: sort.sort_by,
        sort_dir: sort.sort_dir,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        customer: filters.customer || undefined,
        vessel: filters.vessel || undefined,
        shipping_line: filters.shipping_line || undefined,
        icd: filters.icd || undefined,
        workflow_status: filters.workflow_status || undefined,
        file_number: filters.file_number || undefined,
        bill_of_lading: filters.bill_of_lading || undefined,
      })
      setRows((res.data || []) as JobListItem[])
      setSummary(res.summary || EMPTY_SUMMARY)
      setPagination({
        current_page: res.pagination.current_page,
        last_page: res.pagination.last_page,
        per_page: res.pagination.per_page,
        total: res.pagination.total,
        from: res.pagination.from ?? null,
        to: res.pagination.to ?? null,
      })
    } catch {
      setRows([])
      setSummary(EMPTY_SUMMARY)
    } finally {
      setLoading(false)
    }
  }, [activeTab, filters, page, sort.sort_by, sort.sort_dir])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const handleSort = (column: string) => {
    setSort((prev) => ({
      sort_by: column,
      sort_dir: prev.sort_by === column && prev.sort_dir === 'asc' ? 'desc' : 'asc',
    }))
    setPage(1)
  }

  const updateFilter = <K extends keyof JobListFilters>(key: K, value: JobListFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as JobWorkflowTab)
    setPage(1)
  }

  const viewJob = (id: number) => {
    void navigate({ to: '/customs/jobs/create', search: { mode: 'view', id: String(id) } })
  }

  const updateJob = (id: number) => {
    void navigate({ to: '/customs/jobs/create', search: { mode: 'update', id: String(id) } })
  }

  const printJob = (id: number) => {
    void navigate({ to: '/customs/jobs/create', search: { mode: 'view', id: String(id) } })
    window.setTimeout(() => window.print(), 800)
  }

  const handleDeleteJob = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await customsJobApi.deleteJob(deleteTarget.id)
      setDeleteTarget(null)
      void loadJobs()
    } catch {
      // interceptor toasts
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!statusTarget) return
    setStatusSaving(true)
    try {
      await customsJobApi.updateWorkflowStatus(statusTarget.id, {
        workflow_status: statusValue,
      })
      toast.success('Job status updated')
      setStatusTarget(null)
      void loadJobs()
    } catch {
      // interceptor toasts
    } finally {
      setStatusSaving(false)
    }
  }

  const handleMarkArrived = async (row: JobListItem) => {
    try {
      await customsJobApi.updateWorkflowStatus(row.id, {
        workflow_status: 'ARRIVED',
        arrival_date: new Date().toISOString().slice(0, 10),
      })
      toast.success('Job marked as arrived')
      void loadJobs()
    } catch {
      // interceptor toasts
    }
  }

  const fetchExportRows = async (): Promise<JobListItem[]> => {
    const res = await customsJobApi.listJobs({
      tab: activeTab,
      page: 1,
      per_page: 5000,
      export: true,
      sort_by: sort.sort_by,
      sort_dir: sort.sort_dir,
      search: filters.search || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      customer: filters.customer || undefined,
      vessel: filters.vessel || undefined,
      shipping_line: filters.shipping_line || undefined,
      icd: filters.icd || undefined,
      workflow_status: filters.workflow_status || undefined,
      file_number: filters.file_number || undefined,
      bill_of_lading: filters.bill_of_lading || undefined,
    })
    return (res.data || []) as JobListItem[]
  }

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExporting(true)
    try {
      const exportRows = await fetchExportRows()
      const columns = exportColumnsForTab(activeTab)
      const tabLabel = WORKFLOW_TAB_LABELS[activeTab].replace(/\s+/g, '_').toLowerCase()
      const stamp = new Date().toISOString().slice(0, 10)
      const base = `customs_jobs_${tabLabel}_${stamp}`
      if (format === 'csv') {
        exportJobsCsv(exportRows, columns, `${base}.csv`)
      } else if (format === 'excel') {
        exportJobsExcel(exportRows, columns, `${base}.xlsx`, WORKFLOW_TAB_LABELS[activeTab])
      } else {
        await exportJobsPdf(exportRows, columns, `${base}.pdf`, `Customs Jobs — ${WORKFLOW_TAB_LABELS[activeTab]}`)
      }
      toast.success(`Exported ${exportRows.length} job(s)`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const summaryCards = useMemo(
    () =>
      WORKFLOW_TABS.map((tab) => ({
        tab,
        label: WORKFLOW_TAB_LABELS[tab],
        count: summary[tab],
      })),
    [summary]
  )

  const renderActions = (row: JobListItem) => {
    const items: Array<{ label: string; icon: React.ReactNode; onClick: () => void }> = [
      { label: 'View Job', icon: <Eye className='mr-2 h-4 w-4' />, onClick: () => viewJob(row.id) },
    ]

    if (activeTab === 'discharged' || activeTab === 'carrying' || activeTab === 'arrived') {
      items.push({
        label: 'Update Status',
        icon: <Pencil className='mr-2 h-4 w-4' />,
        onClick: () => {
          setStatusTarget(row)
          setStatusValue(row.workflow_status || 'DISCHARGED')
        },
      })
    }

    if (activeTab === 'discharged' || activeTab === 'arrived') {
      items.push({
        label: 'Print Job',
        icon: <Printer className='mr-2 h-4 w-4' />,
        onClick: () => printJob(row.id),
      })
    }

    if (activeTab === 'carrying' || activeTab === 'not_arrived') {
      items.push({
        label: 'Mark Arrived',
        icon: <Truck className='mr-2 h-4 w-4' />,
        onClick: () => void handleMarkArrived(row),
      })
    }

    if (activeTab === 'arrived') {
      items.push({
        label: 'Continue Clearance',
        icon: <Pencil className='mr-2 h-4 w-4' />,
        onClick: () => updateJob(row.id),
      })
    }

    if (activeTab === 'all') {
      items.push(
        {
          label: 'Update',
          icon: <Pencil className='mr-2 h-4 w-4' />,
          onClick: () => updateJob(row.id),
        },
        {
          label: 'Delete',
          icon: <Trash2 className='mr-2 h-4 w-4' />,
          onClick: () => setDeleteTarget(row),
        }
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size='sm' variant='outline'>
            Actions
            <ChevronDown className='ml-2 h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-48'>
          <DropdownMenuLabel>Action</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((item) => (
            <DropdownMenuItem key={item.label} onClick={item.onClick}>
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderAllJobsTable = () => (
    <div className='overflow-x-auto rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label='Job No' column='job_no' sort={sort} onSort={handleSort} />
            <SortableHead label='Customer' column='customer' sort={sort} onSort={handleSort} />
            <SortableHead label='Bill of Lading' column='bill_of_lading' sort={sort} onSort={handleSort} />
            <SortableHead label='Vessel' column='vessel' sort={sort} onSort={handleSort} />
            <SortableHead label='Voyage' column='voyage' sort={sort} onSort={handleSort} />
            <SortableHead label='Shipping Line' column='shipping_line' sort={sort} onSort={handleSort} />
            <SortableHead label='ETA' column='eta' sort={sort} onSort={handleSort} />
            <SortableHead label='ICD' column='icd' sort={sort} onSort={handleSort} />
            <SortableHead label='Containers' column='container_count' sort={sort} onSort={handleSort} />
            <SortableHead label='Status' column='current_status' sort={sort} onSort={handleSort} />
            <SortableHead label='Created' column='created_at' sort={sort} onSort={handleSort} />
            <SortableHead label='Updated' column='updated_at' sort={sort} onSort={handleSort} />
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className='font-medium whitespace-nowrap'>{row.job_no}</TableCell>
              <TableCell className='min-w-[140px]'>{row.customer_name}</TableCell>
              <TableCell>{row.bill_of_lading || '—'}</TableCell>
              <TableCell>{row.vessel || '—'}</TableCell>
              <TableCell>{row.voyage || '—'}</TableCell>
              <TableCell>{row.shipping_line || '—'}</TableCell>
              <TableCell>{formatListDate(row.eta)}</TableCell>
              <TableCell>{row.icd || '—'}</TableCell>
              <TableCell>{row.container_count}</TableCell>
              <TableCell><StatusBadge row={row} tab={activeTab} /></TableCell>
              <TableCell className='whitespace-nowrap'>{formatDateTime(row.created_at)}</TableCell>
              <TableCell className='whitespace-nowrap'>{formatDateTime(row.updated_at)}</TableCell>
              <TableCell className='text-right'>{renderActions(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderDischargedTable = () => (
    <div className='overflow-x-auto rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label='Job No' column='job_no' sort={sort} onSort={handleSort} />
            <SortableHead label='Customer' column='customer' sort={sort} onSort={handleSort} />
            <SortableHead label='Vessel' column='vessel' sort={sort} onSort={handleSort} />
            <SortableHead label='Voyage' column='voyage' sort={sort} onSort={handleSort} />
            <SortableHead label='ETA' column='eta' sort={sort} onSort={handleSort} />
            <SortableHead label='Discharge Date' column='discharge_date' sort={sort} onSort={handleSort} />
            <SortableHead label='ICD' column='icd' sort={sort} onSort={handleSort} />
            <SortableHead label='Bill of Lading' column='bill_of_lading' sort={sort} onSort={handleSort} />
            <SortableHead label='Containers' column='container_count' sort={sort} onSort={handleSort} />
            <SortableHead label='Status' column='current_status' sort={sort} onSort={handleSort} />
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className='font-medium'>{row.job_no}</TableCell>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>{row.vessel || '—'}</TableCell>
              <TableCell>{row.voyage || '—'}</TableCell>
              <TableCell>{formatListDate(row.eta)}</TableCell>
              <TableCell>{formatListDate(row.discharge_date)}</TableCell>
              <TableCell>{row.icd || '—'}</TableCell>
              <TableCell>{row.bill_of_lading || '—'}</TableCell>
              <TableCell>{row.container_count}</TableCell>
              <TableCell><StatusBadge row={row} tab={activeTab} /></TableCell>
              <TableCell className='text-right'>{renderActions(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderCarryingTable = () => (
    <div className='overflow-x-auto rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label='Job No' column='job_no' sort={sort} onSort={handleSort} />
            <SortableHead label='Customer' column='customer' sort={sort} onSort={handleSort} />
            <SortableHead label='Truck' column='truck_number' sort={sort} onSort={handleSort} />
            <SortableHead label='Driver' column='driver' sort={sort} onSort={handleSort} />
            <SortableHead label='Pickup Date' column='pickup_date' sort={sort} onSort={handleSort} />
            <SortableHead label='ICD Destination' column='icd_destination' sort={sort} onSort={handleSort} />
            <TableHead>Containers</TableHead>
            <SortableHead label='Location' column='current_location' sort={sort} onSort={handleSort} />
            <SortableHead label='Expected Arrival' column='expected_arrival' sort={sort} onSort={handleSort} />
            <SortableHead label='Status' column='current_status' sort={sort} onSort={handleSort} />
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className='font-medium'>{row.job_no}</TableCell>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>{row.truck_number || '—'}</TableCell>
              <TableCell>{row.driver || '—'}</TableCell>
              <TableCell>{formatListDate(row.pickup_date)}</TableCell>
              <TableCell>{row.icd_destination || '—'}</TableCell>
              <TableCell className='max-w-[200px] truncate' title={row.container_numbers_label}>{row.container_numbers_label || '—'}</TableCell>
              <TableCell>{row.current_location || '—'}</TableCell>
              <TableCell>{formatListDate(row.expected_arrival)}</TableCell>
              <TableCell><StatusBadge row={row} tab={activeTab} /></TableCell>
              <TableCell className='text-right'>{renderActions(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderArrivedTable = () => (
    <div className='overflow-x-auto rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label='Job No' column='job_no' sort={sort} onSort={handleSort} />
            <SortableHead label='Customer' column='customer' sort={sort} onSort={handleSort} />
            <SortableHead label='Arrival Date' column='arrival_date' sort={sort} onSort={handleSort} />
            <SortableHead label='ICD' column='icd' sort={sort} onSort={handleSort} />
            <SortableHead label='Warehouse' column='warehouse' sort={sort} onSort={handleSort} />
            <SortableHead label='Truck' column='truck_number' sort={sort} onSort={handleSort} />
            <TableHead>Containers</TableHead>
            <SortableHead label='Status' column='current_status' sort={sort} onSort={handleSort} />
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className='font-medium'>{row.job_no}</TableCell>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>{formatListDate(row.arrival_date)}</TableCell>
              <TableCell>{row.icd || '—'}</TableCell>
              <TableCell>{row.warehouse || '—'}</TableCell>
              <TableCell>{row.truck_number || '—'}</TableCell>
              <TableCell className='max-w-[200px] truncate' title={row.container_numbers_label}>{row.container_numbers_label || '—'}</TableCell>
              <TableCell><StatusBadge row={row} tab={activeTab} /></TableCell>
              <TableCell className='text-right'>{renderActions(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderNotArrivedTable = () => (
    <div className='overflow-x-auto rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label='Job No' column='job_no' sort={sort} onSort={handleSort} />
            <SortableHead label='Customer' column='customer' sort={sort} onSort={handleSort} />
            <SortableHead label='Truck' column='truck_number' sort={sort} onSort={handleSort} />
            <SortableHead label='Driver' column='driver' sort={sort} onSort={handleSort} />
            <SortableHead label='Pickup Date' column='pickup_date' sort={sort} onSort={handleSort} />
            <SortableHead label='Expected Arrival' column='expected_arrival' sort={sort} onSort={handleSort} />
            <TableHead>Delay</TableHead>
            <SortableHead label='Destination' column='destination' sort={sort} onSort={handleSort} />
            <TableHead>Containers</TableHead>
            <SortableHead label='Remarks' column='remarks' sort={sort} onSort={handleSort} />
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={row.is_overdue ? 'bg-red-50/80 hover:bg-red-50' : undefined}>
              <TableCell className='font-medium'>{row.job_no}</TableCell>
              <TableCell>{row.customer_name}</TableCell>
              <TableCell>{row.truck_number || '—'}</TableCell>
              <TableCell>{row.driver || '—'}</TableCell>
              <TableCell>{formatListDate(row.pickup_date)}</TableCell>
              <TableCell>{formatListDate(row.expected_arrival)}</TableCell>
              <TableCell className={row.is_overdue ? 'font-medium text-red-700' : undefined}>
                {row.delay_duration || '—'}
              </TableCell>
              <TableCell>{row.destination || '—'}</TableCell>
              <TableCell className='max-w-[180px] truncate' title={row.container_numbers_label}>{row.container_numbers_label || '—'}</TableCell>
              <TableCell className='max-w-[160px] truncate' title={row.remarks}>{row.remarks || '—'}</TableCell>
              <TableCell className='text-right'>{renderActions(row)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderTable = () => {
    switch (activeTab) {
      case 'discharged':
        return renderDischargedTable()
      case 'carrying':
        return renderCarryingTable()
      case 'arrived':
        return renderArrivedTable()
      case 'not_arrived':
        return renderNotArrivedTable()
      default:
        return renderAllJobsTable()
    }
  }

  return (
    <CustomsPage
      title='Jobs'
      description='Track shipment progress from discharge through ICD arrival — replacing the manual Excel workflow.'
    >
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        {summaryCards.map((card) => (
          <Card
            key={card.tab}
            className={activeTab === card.tab ? 'border-amber-500 ring-1 ring-amber-200' : 'cursor-pointer'}
            onClick={() => handleTabChange(card.tab)}
          >
            <CardHeader className='pb-2'>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className='text-3xl tabular-nums'>{card.count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle>Shipment tracking</CardTitle>
              <CardDescription>
                Filters stay active when switching tabs. Data is loaded from the jobs table with workflow status.
              </CardDescription>
            </div>
            <div className='flex flex-wrap gap-2'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type='button' variant='outline' disabled={exporting || loading}>
                    <Download className='mr-2 h-4 w-4' />
                    {exporting ? 'Exporting…' : 'Export'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={() => void handleExport('excel')}>Excel (.xlsx)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleExport('csv')}>CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleExport('pdf')}>PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type='button' onClick={() => void navigate({ to: '/customs/jobs/create' })}>
                <Plus className='mr-2 h-4 w-4' />
                Create Job
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            <div className='relative md:col-span-2 xl:col-span-4'>
              <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                className='pl-8'
                placeholder='Search file no, customer, container, B/L, truck, driver, TANSAD…'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className='space-y-1'>
              <Label>Date from</Label>
              <Input type='date' value={filters.date_from} onChange={(e) => updateFilter('date_from', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Date to</Label>
              <Input type='date' value={filters.date_to} onChange={(e) => updateFilter('date_to', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Customer</Label>
              <Input value={filters.customer} onChange={(e) => updateFilter('customer', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Vessel</Label>
              <Input value={filters.vessel} onChange={(e) => updateFilter('vessel', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Shipping line</Label>
              <Input value={filters.shipping_line} onChange={(e) => updateFilter('shipping_line', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>ICD</Label>
              <Input value={filters.icd} onChange={(e) => updateFilter('icd', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Status</Label>
              <Select
                value={filters.workflow_status || '__all__'}
                onValueChange={(v) => updateFilter('workflow_status', v === '__all__' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder='All statuses' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='__all__'>All statuses</SelectItem>
                  <SelectItem value='DISCHARGED'>Discharged</SelectItem>
                  <SelectItem value='CARRYING'>Carrying</SelectItem>
                  <SelectItem value='ARRIVED'>Arrived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label>File number</Label>
              <Input value={filters.file_number} onChange={(e) => updateFilter('file_number', e.target.value)} />
            </div>
            <div className='space-y-1'>
              <Label>Bill of lading</Label>
              <Input value={filters.bill_of_lading} onChange={(e) => updateFilter('bill_of_lading', e.target.value)} />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className='flex h-auto flex-wrap'>
              {WORKFLOW_TABS.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {WORKFLOW_TAB_LABELS[tab]}
                </TabsTrigger>
              ))}
            </TabsList>

            {loading ? (
              <div className='mt-4 space-y-2'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className='mt-4 rounded-md border py-10 text-center text-muted-foreground'>
                No jobs match the current filters.
              </div>
            ) : (
              <div className='mt-4'>{renderTable()}</div>
            )}
          </Tabs>

          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-sm text-muted-foreground'>
              {pagination.total > 0
                ? `Showing ${pagination.from ?? 0}–${pagination.to ?? 0} of ${pagination.total}`
                : 'No results'}
            </p>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={loading || page >= pagination.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update workflow status</DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <Label>Status for {statusTarget?.job_no}</Label>
            <Select value={statusValue} onValueChange={(v) => setStatusValue(v as JobWorkflowStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(WORKFLOW_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button type='button' disabled={statusSaving} onClick={() => void handleStatusUpdate()}>
              {statusSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete job <strong>{deleteTarget?.job_no || ''}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLoading}
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteJob()
              }}
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CustomsPage>
  )
}
