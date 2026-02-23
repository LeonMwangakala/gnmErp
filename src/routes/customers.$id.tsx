import { createFileRoute, redirect } from '@tanstack/react-router'
import { CustomerDetail } from '@/features/customers/detail'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/customers/$id')({
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
        <CustomerDetail />
      </AuthenticatedLayout>
    )
  },
})
