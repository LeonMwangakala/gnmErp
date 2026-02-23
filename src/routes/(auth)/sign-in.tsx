import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { useAuthStore } from '@/stores/auth-store'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  beforeLoad: () => {
    // If user is already authenticated, redirect to home
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    if (isAuthenticated) {
      throw redirect({
        to: '/home',
        search: undefined,
      })
    }
  },
  component: SignIn,
  validateSearch: searchSchema,
})
