import { createFileRoute, redirect } from '@tanstack/react-router'
import { Dashboard } from '@/features/dashboard'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/home')({
  beforeLoad: () => {
    // If user is not authenticated, redirect to sign-in
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
        <Dashboard />
      </AuthenticatedLayout>
    )
  },
})
