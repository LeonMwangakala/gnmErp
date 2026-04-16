import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { CustomsPage } from './customs-page'
import { CustomsCreateJob } from './jobs-create'
import { Button } from '@/components/ui/button'
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
import {
  createInitialJobStageAssignments,
  createInitialJobStageProgress,
  getStoredJobs,
  JOB_STAGE_ORDER,
  type Job,
  type JobStageAssignments,
  type JobStageProgress,
} from './jobs-storage'

function normalizeJob(job: Job): Job {
  const initialProgress = createInitialJobStageProgress()
  const initialAssignments = createInitialJobStageAssignments()
  const migratedProgress: JobStageProgress = job.stageProgress
    ? {
        SHIPPING_LINE: job.stageProgress.SHIPPING_LINE ?? 'PENDING',
        DECLARATION_TRA: job.stageProgress.DECLARATION_TRA ?? 'PENDING',
        PORT: job.stageProgress.PORT ?? 'PENDING',
        TBS: job.stageProgress.TBS ?? 'PENDING',
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
  const migratedAssignments: JobStageAssignments = job.stageAssignments
    ? {
        SHIPPING_LINE:
          job.stageAssignments.SHIPPING_LINE ?? initialAssignments.SHIPPING_LINE,
        DECLARATION_TRA:
          job.stageAssignments.DECLARATION_TRA ?? initialAssignments.DECLARATION_TRA,
        PORT: job.stageAssignments.PORT ?? initialAssignments.PORT,
        TBS: job.stageAssignments.TBS ?? initialAssignments.TBS,
      }
    : initialAssignments

  return {
    ...job,
    stageProgress: migratedProgress,
    stageAssignments: migratedAssignments,
  }
}

export function CustomsJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const createMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mode') === 'create'

  useEffect(() => {
    const stored = getStoredJobs().map(normalizeJob)
    setJobs(stored)
  }, [])

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

  if (createMode) {
    return <CustomsCreateJob />
  }

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
              onClick={() => {
                const basePath = window.location.pathname.replace(/\/$/, '')
                window.location.assign(`${basePath}?mode=create`)
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
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => window.location.assign('/customs/work-flow')}
                        >
                          Open Work Flow
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className='mt-3 text-xs text-muted-foreground'>Stage actions are available on the Work Flow page only.</p>
        </CardContent>
      </Card>
    </CustomsPage>
  )
}
