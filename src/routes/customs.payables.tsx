import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CustomsPayables } from '@/features/customs/payables'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/customs/payables')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: undefined,
      })
    }
  },
  component: () => (
    <AuthenticatedLayout>
      <CustomsPayables />
    </AuthenticatedLayout>
  ),
})
