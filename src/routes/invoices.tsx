import { createFileRoute, redirect } from '@tanstack/react-router'
import { Invoices } from '@/features/invoices'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/invoices')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: '/invoices' },
      })
    }
  },
  component: () => (
    <AuthenticatedLayout>
      <Invoices />
    </AuthenticatedLayout>
  ),
})
