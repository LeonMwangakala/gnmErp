import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    console.log('Authenticated route beforeLoad:', location.pathname)
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    console.log('Is authenticated:', isAuthenticated)
    
    if (!isAuthenticated) {
      // User is not authenticated, redirect to sign-in with current path as redirect
      const currentPath = window.location.pathname
      throw redirect({
        to: '/sign-in',
        search: { redirect: currentPath },
      })
    }
    
    // Don't redirect here - let TanStack Router handle the path matching
    // The route should match both /_authenticated and /_authenticated/
  },
  component: () => {
    console.log('AuthenticatedLayout component rendering')
    return <AuthenticatedLayout />
  },
})
