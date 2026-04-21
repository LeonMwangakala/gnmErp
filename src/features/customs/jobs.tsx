import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { CustomsPage } from './customs-page'
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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { customsJobApi } from '@/lib/api'
import {
  createInitialJobStageAssignments,
  createInitialJobStageProgress,
  getStoredJobs,
  saveStoredJobs,
  JOB_STAGE_ORDER,
  type Job,
  type JobStageAssignments,
  type JobStageProgress,
} from './jobs-storage'

function normalizeJob(job: Job): Job {
  const raw = job as unknown as Record<string, any>
  const stageProgressSource =
    job.stageProgress || (raw.stage_progress as JobStageProgress | undefined) || undefined
  const stageAssignmentsSource =
    job.stageAssignments || (raw.stage_assignments as JobStageAssignments | undefined) || undefined
  const initialProgress = createInitialJobStageProgress()
  const initialAssignments = createInitialJobStageAssignments()
  const migratedProgress: JobStageProgress = stageProgressSource
    ? {
        SHIPPING_LINE: stageProgressSource.SHIPPING_LINE ?? 'PENDING',
        DECLARATION_TRA: stageProgressSource.DECLARATION_TRA ?? 'PENDING',
        PORT: stageProgressSource.PORT ?? 'PENDING',
        TBS: stageProgressSource.TBS ?? 'PENDING',
      }
    : initialProgress

  // Backward compatibility for previously stored "single stage" jobs.
  const legacyStage = job.stage
  if (!job.stageProgress && legacyStage) {
    JOB_STAGE_ORDER.forEach((stage) => {
      if (stage === legacyStage) return
      migratedProgress[stage] =
        JOB_STAGE_ORDER.indexOf(stage) < JOB_STAGE_ORDER.indexOf(legacyStage)
          ? 'COMPLETED'
          : 'PENDING'
    })
    migratedProgress[legacyStage] =
      job.stageStatus === 'COMPLETED' ? 'COMPLETED' : 'PENDING'
  }
  const migratedAssignments: JobStageAssignments = stageAssignmentsSource
    ? {
        SHIPPING_LINE:
          stageAssignmentsSource.SHIPPING_LINE ?? initialAssignments.SHIPPING_LINE,
        DECLARATION_TRA:
          stageAssignmentsSource.DECLARATION_TRA ?? initialAssignments.DECLARATION_TRA,
        PORT: stageAssignmentsSource.PORT ?? initialAssignments.PORT,
        TBS: stageAssignmentsSource.TBS ?? initialAssignments.TBS,
      }
    : initialAssignments

  return {
    ...job,
    id: Number(job.id || raw.id) || Date.now(),
    jobNo: String(job.jobNo || raw.job_no || ''),
    customerName: String(job.customerName || raw.customer_name || ''),
    shipmentType: String(job.shipmentType || raw.shipment_type || ''),
    mblNo: String(job.mblNo || raw.mbl_no || ''),
    hblNo: String(job.hblNo || raw.hbl_no || ''),
    invoiceNo: String(job.invoiceNo || raw.invoice_no || ''),
    dateOfReceipt: String(job.dateOfReceipt || raw.date_of_receipt || '-'),
    createdAt: String(job.createdAt || raw.created_at || new Date().toISOString()),
    stageProgress: migratedProgress,
    stageAssignments: migratedAssignments,
  }
}

export function CustomsJobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    customsJobApi
      .listJobs({ per_page: 200, page: 1 })
      .then((res) => {
        if (cancelled) return
        const rows = (res.data || []).map((row) => normalizeJob(row as Job))
        setJobs(rows)
        saveStoredJobs(rows)
      })
      .catch(() => {
        if (cancelled) return
        const stored = getStoredJobs().map(normalizeJob)
        setJobs(stored)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleDeleteJob = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await customsJobApi.deleteJob(deleteTarget.id)
      setJobs((prev) => {
        const next = prev.filter((row) => row.id !== deleteTarget.id)
        saveStoredJobs(next)
        return next
      })
      setDeleteTarget(null)
    } catch {
      // axios interceptor toasts
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter(
      (j) =>
        j.jobNo.toLowerCase().includes(q) ||
        j.customerName.toLowerCase().includes(q) ||
        j.mblNo.toLowerCase().includes(q) ||
        j.hblNo.toLowerCase().includes(q)
    )
  }, [jobs, search])

  return (
    <CustomsPage title='Jobs' description='Manage customs jobs and track each clearance task.'>
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle>Jobs</CardTitle>
              <CardDescription>List of customs clearance jobs</CardDescription>
            </div>
            <Button
              type='button'
              onClick={() => {
                void navigate({ to: '/customs/jobs/create' })
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              Create Job
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='relative mb-4 max-w-md'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              className='pl-8'
              placeholder='Search by Job No, customer, MBL, HBL'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>Job No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Shipment Type</TableHead>
                  <TableHead>Date of Receipt</TableHead>
                  <TableHead>Shipping</TableHead>
                  <TableHead>Declaration</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>TBS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className='py-8 text-center text-muted-foreground'>
                      No jobs yet. Click "Create Job" to add your first record.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job, index) => (
                    <TableRow key={job.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className='font-medium'>{job.jobNo}</TableCell>
                      <TableCell>{job.customerName}</TableCell>
                      <TableCell>{job.shipmentType}</TableCell>
                      <TableCell>{job.dateOfReceipt}</TableCell>
                      <TableCell>
                        <Badge variant='outline'>{job.stageProgress.SHIPPING_LINE}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{job.stageProgress.DECLARATION_TRA}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{job.stageProgress.PORT}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{job.stageProgress.TBS}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{job.status}</Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size='sm' variant='outline'>
                              Options
                              <ChevronDown className='ml-2 h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-44'>
                            <DropdownMenuLabel>Action</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                void navigate({
                                  to: '/customs/jobs/create',
                                  search: { mode: 'view', id: String(job.id) },
                                })
                              }
                            >
                              <Eye className='mr-2 h-4 w-4' />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                void navigate({
                                  to: '/customs/jobs/create',
                                  search: { mode: 'update', id: String(job.id) },
                                })
                              }
                            >
                              <Pencil className='mr-2 h-4 w-4' />
                              Update
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-destructive focus:text-destructive'
                              onClick={() => setDeleteTarget(job)}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {loading ? <p className='mt-3 text-xs text-muted-foreground'>Loading jobs...</p> : null}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete job <strong>{deleteTarget?.jobNo || ''}</strong>.
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
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CustomsPage>
  )
}
