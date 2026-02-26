import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { ExpensePayments } from '@/features/expense-payments'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/accounting/expenses/payments')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: '/accounting/expenses/payments' },
      })
    }
  },
  component: () => (
    <AuthenticatedLayout>
      <ExpensePayments />
    </AuthenticatedLayout>
  ),
})
