import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '@/features/dashboard'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated/')({
  component: () => {
    return (
      <AuthenticatedLayout>
        <Dashboard />
      </AuthenticatedLayout>
    )
  },
})
