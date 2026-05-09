import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { CustomsCreateJob } from '@/features/customs/jobs-create'

/** Keeps view/update query params in router state (href alone may omit search). */
const jobsCreateSearchSchema = z.object({
  mode: z.enum(['view', 'update', 'create']).optional(),
  id: z.string().optional(),
  jobId: z.string().optional(),
  job_id: z.string().optional(),
})

export const Route = createFileRoute('/customs/jobs/create')({
  validateSearch: jobsCreateSearchSchema,
  component: CustomsCreateJob,
})
