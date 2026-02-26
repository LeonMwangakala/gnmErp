import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { PettyCashRequests } from '@/features/petty-cash-requests'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/accounting/expenses/petty-cash-requests')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: '/accounting/expenses/petty-cash-requests' },
      })
    }
  },
  component: () => (
    <AuthenticatedLayout>
      <PettyCashRequests />
    </AuthenticatedLayout>
  ),
})
