import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { Bills } from '@/features/bills'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/accounting/expenses/bills')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: '/accounting/expenses/bills' },
      })
    }
  },
  component: () => (
    <AuthenticatedLayout>
      <Bills />
    </AuthenticatedLayout>
  ),
})

