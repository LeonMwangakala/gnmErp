import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CustomsDashboard } from '@/features/customs/dashboard'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/customs/dashboard')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: undefined,
      })
    }
  },
  component: () => {
    return (
      <AuthenticatedLayout>
        <CustomsDashboard />
      </AuthenticatedLayout>
    )
  },
})
