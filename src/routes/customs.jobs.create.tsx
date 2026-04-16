import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CustomsCreateJob } from '@/features/customs/jobs-create'

export const Route = createFileRoute('/customs/jobs/create')({
  component: () => (
    <AuthenticatedLayout>
      <CustomsCreateJob />
    </AuthenticatedLayout>
  ),
})
