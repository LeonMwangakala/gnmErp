import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CustomsWorkFlow } from '@/features/customs/work-flow'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/customs/work-flow')({
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
        <CustomsWorkFlow />
      </AuthenticatedLayout>
    )
  },
})
