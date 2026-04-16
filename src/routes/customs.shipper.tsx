import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CustomsShipper } from '@/features/customs/shipper'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/customs/shipper')({
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
      <CustomsShipper />
    </AuthenticatedLayout>
  ),
})
