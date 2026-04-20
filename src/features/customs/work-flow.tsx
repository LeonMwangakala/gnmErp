import { useEffect, useMemo, useState } from 'react'
import { Eye } from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import {
  createInitialJobStageAssignments,
  createInitialJobStageProgress,
  getStoredJobs,
  JOB_STAGE_ORDER,
  type Job,
  type JobStage,
  type JobStageAssignments,
  type JobStageProgress,
  updateStoredJob,
} from './jobs-storage'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHoverDropdownDelay } from '@/hooks/use-hover-dropdown'

const STAGE_LABELS: Record<JobStage, string> = {
  SHIPPING_LINE: 'Shipping Line',
  DECLARATION_TRA: 'Declaration',
  TBS: 'TBS',
  PORT: 'Port',
}

const STAGE_ACTION_LABELS: Record<JobStage, string> = {
  SHIPPING_LINE: 'Process Delivery Order',
  DECLARATION_TRA: 'Process Assessment & Customs Payment',
  TBS: 'Process TBS Inspection',
  PORT: 'Process Port Inspection & Charges',
}

const WORKFLOW_TABS: JobStage[] = ['SHIPPING_LINE', 'DECLARATION_TRA', 'TBS', 'PORT']

function mapDepartmentToStage(departmentName?: string | null): JobStage | null {
  const normalized = (departmentName || '').toLowerCase()
  if (normalized.includes('shipping')) return 'SHIPPING_LINE'
  if (normalized.includes('declaration') || normalized.includes('tra')) return 'DECLARATION_TRA'
  if (normalized.includes('tbs')) return 'TBS'
  if (normalized.includes('port')) return 'PORT'
  return null
}

function normalizeJob(job: Job): Job {
  const initialProgress = createInitialJobStageProgress()
  const initialAssignments = createInitialJobStageAssignments()
  const stageProgress: JobStageProgress = job.stageProgress
    ? {
        SHIPPING_LINE: job.stageProgress.SHIPPING_LINE ?? 'PENDING',
        DECLARATION_TRA: job.stageProgress.DECLARATION_TRA ?? 'PENDING',
        TBS: job.stageProgress.TBS ?? 'PENDING',
        PORT: job.stageProgress.PORT ?? 'PENDING',
      }
    : initialProgress
  const stageAssignments: JobStageAssignments = job.stageAssignments
    ? {
        SHIPPING_LINE:
          job.stageAssignments.SHIPPING_LINE ?? initialAssignments.SHIPPING_LINE,
        DECLARATION_TRA:
          job.stageAssignments.DECLARATION_TRA ?? initialAssignments.DECLARATION_TRA,
        TBS: job.stageAssignments.TBS ?? initialAssignments.TBS,
        PORT: job.stageAssignments.PORT ?? initialAssignments.PORT,
      }
    : initialAssignments

  return { ...job, stageProgress, stageAssignments }
}

export function CustomsWorkFlow() {
  const user = useAuthStore((s) => s.auth.user)
  const [jobs, setJobs] = useState<Job[]>([])
  const [activeTab, setActiveTab] = useState<JobStage>('SHIPPING_LINE')
  const [menuOpenKey, setMenuOpenKey] = useState<string | null>(null)
  const [inspect, setInspect] = useState<{ job: Job; stage: JobStage } | null>(null)
  const hoverMenu = useHoverDropdownDelay()
  const isAdmin = user?.role?.includes('admin') || user?.type === 'admin' || user?.type === 'owner'
  const isSupervisor =
    (user?.employee_context?.designation_name || '').toLowerCase().includes('supervisor') ||
    (user?.type || '').toLowerCase().includes('supervisor')
  const userStage = mapDepartmentToStage(user?.employee_context?.department_name)

  useEffect(() => {
    setJobs(getStoredJobs().map(normalizeJob))
  }, [])

  const jobsForTab = useMemo(() => jobs, [jobs])

  const updateJob = (updated: Job) => {
    updateStoredJob(updated)
    setJobs((prev) => prev.map((job) => (job.id === updated.id ? updated : job)))
  }

  const assignToMe = (job: Job, stage: JobStage) => {
    if (!user) return
    const updated: Job = {
      ...job,
      stageAssignments: {
        ...job.stageAssignments,
        [stage]: {
          assigneeId: user.id,
          assigneeName: user.name,
          assignedAt: new Date().toISOString(),
        },
      },
    }
    updateJob(updated)
    toast.success(`${STAGE_LABELS[stage]} assigned to you`)
  }

  const reassignStage = (job: Job, stage: JobStage) => {
    if (!isAdmin && !isSupervisor) return
    const assigneeName = window.prompt(`Reassign ${STAGE_LABELS[stage]} to staff name`)
    if (!assigneeName?.trim()) return
    const updated: Job = {
      ...job,
      stageAssignments: {
        ...job.stageAssignments,
        [stage]: {
          assigneeId: null,
          assigneeName: assigneeName.trim(),
          assignedAt: new Date().toISOString(),
        },
      },
    }
    updateJob(updated)
    toast.success(`${STAGE_LABELS[stage]} reassigned to ${assigneeName.trim()}`)
  }

  const processStage = (job: Job, stage: JobStage) => {
    if (stage === 'TBS' && job.stageProgress.DECLARATION_TRA !== 'COMPLETED') {
      toast.error('TBS depends on Declaration completion')
      return
    }
    const isAssignedToUser = job.stageAssignments[stage].assigneeId === user?.id
    if (!isAdmin && !isSupervisor && !isAssignedToUser) {
      toast.error('Assign this stage to yourself before processing')
      return
    }
    if (job.stageProgress[stage] === 'COMPLETED') {
      toast.info(`${STAGE_LABELS[stage]} already completed`)
      return
    }
    const updatedProgress: JobStageProgress = {
      ...job.stageProgress,
      [stage]: 'COMPLETED',
    }
    const isWorkflowDone = JOB_STAGE_ORDER.every((s) => updatedProgress[s] === 'COMPLETED')
    const updated: Job = {
      ...job,
      stageProgress: updatedProgress,
      status: isWorkflowDone ? 'Job Workflow Completed' : `${STAGE_LABELS[stage]} Completed`,
    }
    updateJob(updated)
    toast.success(`${STAGE_LABELS[stage]} completed`)
  }

  const rowMenuKey = (stage: JobStage, jobId: number) => `${stage}-${jobId}`

  return (
    <CustomsPage
      title='Work Flow'
      description='Track and process all customs jobs by stage.'
    >
      <Dialog open={!!inspect} onOpenChange={(open) => !open && setInspect(null)}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>{inspect ? `Job ${inspect.job.jobNo}` : 'Job'}</DialogTitle>
          </DialogHeader>
          {inspect ? (
            <div className='grid gap-3 text-sm'>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div>
                  <p className='text-muted-foreground'>Customer</p>
                  <p className='font-medium'>{inspect.job.customerName}</p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Shipment type</p>
                  <p className='font-medium'>{inspect.job.shipmentType}</p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Date of receipt</p>
                  <p className='font-medium'>{inspect.job.dateOfReceipt}</p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Overall status</p>
                  <p className='font-medium'>{inspect.job.status}</p>
                </div>
                <div>
                  <p className='text-muted-foreground'>MBL</p>
                  <p className='font-medium'>{inspect.job.mblNo || '—'}</p>
                </div>
                <div>
                  <p className='text-muted-foreground'>HBL</p>
                  <p className='font-medium'>{inspect.job.hblNo || '—'}</p>
                </div>
              </div>
              <div className='rounded-md border p-3'>
                <p className='mb-2 text-xs font-medium text-muted-foreground'>Stage status</p>
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  {WORKFLOW_TABS.map((s) => (
                    <div key={s} className='flex justify-between gap-2'>
                      <span className='text-muted-foreground'>{STAGE_LABELS[s]}</span>
                      <Badge variant='outline' className='shrink-0 text-[10px]'>
                        {inspect.job.stageProgress[s]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              <p className='text-xs text-muted-foreground'>
                Opened from the <span className='font-medium'>{STAGE_LABELS[inspect.stage]}</span> tab.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setInspect(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Work Flow</CardTitle>
          <CardDescription>
            Every tab shows all jobs with stage-specific status and actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as JobStage)}
            className='w-full'
          >
            <TabsList className='grid w-full grid-cols-2 md:grid-cols-4'>
              {WORKFLOW_TABS.map((stage) => (
                <TabsTrigger key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </TabsTrigger>
              ))}
            </TabsList>

            {WORKFLOW_TABS.map((stage) => (
              <TabsContent key={stage} value={stage} className='mt-4'>
                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>S/N</TableHead>
                        <TableHead>Job No</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Shipment Type</TableHead>
                        <TableHead>Date of Receipt</TableHead>
                        <TableHead>{STAGE_LABELS[stage]} Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Overall Status</TableHead>
                        <TableHead className='min-w-[120px] text-right whitespace-nowrap'>Options</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobsForTab.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className='py-8 text-center text-muted-foreground'>
                            No jobs available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        jobsForTab.map((job, index) => (
                          <TableRow key={job.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className='font-medium'>{job.jobNo}</TableCell>
                            <TableCell>{job.customerName}</TableCell>
                            <TableCell>{job.shipmentType}</TableCell>
                            <TableCell>{job.dateOfReceipt}</TableCell>
                            <TableCell>
                              <Badge variant='outline'>{job.stageProgress[stage]}</Badge>
                            </TableCell>
                            <TableCell>
                              {job.stageAssignments[stage].assigneeName || 'Unassigned'}
                            </TableCell>
                            <TableCell>
                              <Badge variant='outline'>{job.status}</Badge>
                            </TableCell>
                            <TableCell className='text-right'>
                              <div
                                className='inline-flex justify-end'
                                onPointerEnter={() => {
                                  hoverMenu.cancel()
                                  setMenuOpenKey(rowMenuKey(stage, job.id))
                                }}
                                onPointerLeave={() => {
                                  hoverMenu.schedule(() => setMenuOpenKey(null))
                                }}
                              >
                                <DropdownMenu
                                  open={menuOpenKey === rowMenuKey(stage, job.id)}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      hoverMenu.cancel()
                                      setMenuOpenKey(rowMenuKey(stage, job.id))
                                    } else {
                                      setMenuOpenKey(null)
                                    }
                                  }}
                                  modal={false}
                                >
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='sm'
                                      className='ml-auto h-8 px-3'
                                    >
                                      Options
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align='end'
                                    className='w-56'
                                    onPointerEnter={hoverMenu.cancel}
                                    onPointerLeave={() => hoverMenu.schedule(() => setMenuOpenKey(null))}
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                  >
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setMenuOpenKey(null)
                                        setInspect({ job, stage })
                                      }}
                                    >
                                      <Eye className='mr-2 h-4 w-4' />
                                      View
                                    </DropdownMenuItem>
                                    {(isAdmin || isSupervisor || userStage === stage) && (
                                      <DropdownMenuItem
                                        onSelect={() => {
                                          setMenuOpenKey(null)
                                          assignToMe(job, stage)
                                        }}
                                      >
                                        Assign To Me
                                      </DropdownMenuItem>
                                    )}
                                    {(isAdmin || isSupervisor || userStage === stage) && (
                                      <DropdownMenuItem
                                        disabled={
                                          stage === 'TBS' &&
                                          job.stageProgress.DECLARATION_TRA !== 'COMPLETED'
                                        }
                                        onSelect={() => {
                                          setMenuOpenKey(null)
                                          processStage(job, stage)
                                        }}
                                      >
                                        {STAGE_ACTION_LABELS[stage]}
                                      </DropdownMenuItem>
                                    )}
                                    {(isAdmin || isSupervisor) && (
                                      <DropdownMenuItem
                                        onSelect={() => {
                                          setMenuOpenKey(null)
                                          reassignStage(job, stage)
                                        }}
                                      >
                                        Reassign
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </CustomsPage>
  )
}
