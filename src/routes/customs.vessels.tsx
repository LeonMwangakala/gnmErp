import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CustomsVessels } from '@/features/customs/vessels'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/customs/vessels')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: undefined,
      })
    }
  },
  component: () => {
    return (
      <AuthenticatedLayout>
        <CustomsVessels />
      </AuthenticatedLayout>
    )
  },
})
