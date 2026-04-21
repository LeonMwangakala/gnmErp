import { createFileRoute } from '@tanstack/react-router'
import { CustomsCreateJob } from '@/features/customs/jobs-create'

export const Route = createFileRoute('/customs/jobs/create')({
  component: CustomsCreateJob,
})
