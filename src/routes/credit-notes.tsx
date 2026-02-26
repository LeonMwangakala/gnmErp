import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CreditNotes } from '@/features/credit-notes'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/credit-notes')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: '/credit-notes' },
      })
    }
  },
  component: () => (
    <AuthenticatedLayout>
      <CreditNotes />
    </AuthenticatedLayout>
  ),
})
