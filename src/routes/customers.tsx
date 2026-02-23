import { createFileRoute, redirect } from '@tanstack/react-router'
import { Customers } from '@/features/customers'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/customers')({
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
        <Customers />
      </AuthenticatedLayout>
    )
  },
})
