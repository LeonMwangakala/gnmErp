import { createFileRoute } from '@tanstack/react-router'
import { CustomsJobs } from '@/features/customs/jobs'

export const Route = createFileRoute('/customs/jobs/')({
  component: CustomsJobs,
})
