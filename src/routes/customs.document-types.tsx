import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CustomsJobDocumentTypes } from '@/features/customs/document-types'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/customs/document-types')({
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
      <CustomsJobDocumentTypes />
    </AuthenticatedLayout>
  ),
})
