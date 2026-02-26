import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { PettyCash } from '@/features/petty-cash'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/accounting/expenses/petty-cash')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: '/accounting/expenses/petty-cash' },
      })
    }
  },
  component: () => (
    <AuthenticatedLayout>
      <PettyCash />
    </AuthenticatedLayout>
  ),
})
