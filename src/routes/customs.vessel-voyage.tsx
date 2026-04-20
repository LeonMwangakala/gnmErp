import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { CustomsVesselVoyage } from '@/features/customs/vessel-voyage'
import { useAuthStore } from '@/stores/auth-store'

const vesselVoyageSearchSchema = z.object({
  vesselId: z.coerce.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/customs/vessel-voyage')({
  validateSearch: vesselVoyageSearchSchema,
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
        <CustomsVesselVoyage />
      </AuthenticatedLayout>
    )
  },
})
