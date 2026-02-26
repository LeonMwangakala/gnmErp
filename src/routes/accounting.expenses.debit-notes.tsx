import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { DebitNotes } from '@/features/debit-notes'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/accounting/expenses/debit-notes')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: '/accounting/expenses/debit-notes' },
      })
    }
  },
  component: () => (
    <AuthenticatedLayout>
      <DebitNotes />
    </AuthenticatedLayout>
  ),
})

