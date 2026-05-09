import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CustomsCountriesPorts } from '@/features/customs/countries-ports'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/customs/countries-ports')({
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
      <CustomsCountriesPorts />
    </AuthenticatedLayout>
  ),
})
