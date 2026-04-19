export const JOB_STAGE_ORDER = [
  'SHIPPING_LINE',
  'DECLARATION_TRA',
  'PORT',
  'TBS',
] as const

export type JobStage = (typeof JOB_STAGE_ORDER)[number]
export type JobStageStatus = 'PENDING' | 'COMPLETED'
export type JobStageProgress = Record<JobStage, JobStageStatus>
export type JobStageAssignment = {
  assigneeId: number | null
  assigneeName: string | null
  assignedAt: string | null
}
export type JobStageAssignments = Record<JobStage, JobStageAssignment>

export type Job = {
  id: number
  jobNo: string
  customerName: string
  shipmentType: string
  mblNo: string
  hblNo: string
  invoiceNo: string
  status: string
  stageProgress: JobStageProgress
  stageAssignments: JobStageAssignments
  stage?: JobStage
  stageStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  meta?: Record<string, unknown>
  dateOfReceipt: string
  createdAt: string
}

const STORAGE_KEY = 'customs_jobs_v1'

export function getStoredJobs(): Job[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Job[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredJobs(jobs: Job[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
}

export function prependStoredJob(job: Job): void {
  const jobs = getStoredJobs()
  saveStoredJobs([job, ...jobs])
}

export function updateStoredJob(updatedJob: Job): void {
  const jobs = getStoredJobs()
  saveStoredJobs(jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)))
}

export function getNextJobStage(stage: JobStage): JobStage | null {
  const idx = JOB_STAGE_ORDER.indexOf(stage)
  if (idx === -1 || idx >= JOB_STAGE_ORDER.length - 1) return null
  return JOB_STAGE_ORDER[idx + 1]
}

export function createInitialJobStageProgress(): JobStageProgress {
  return {
    SHIPPING_LINE: 'PENDING',
    DECLARATION_TRA: 'PENDING',
    PORT: 'PENDING',
    TBS: 'PENDING',
  }
}

export function createInitialJobStageAssignments(): JobStageAssignments {
  return {
    SHIPPING_LINE: { assigneeId: null, assigneeName: null, assignedAt: null },
    DECLARATION_TRA: { assigneeId: null, assigneeName: null, assignedAt: null },
    PORT: { assigneeId: null, assigneeName: null, assignedAt: null },
    TBS: { assigneeId: null, assigneeName: null, assignedAt: null },
  }
}
