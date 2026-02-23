import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, redirect } from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: ({ location }) => {
    const isAuthenticated = useAuthStore.getState().auth.isAuthenticated()
    
    // Handle root path "/" - redirect to sign-in or home based on auth status
    if (location.pathname === '/') {
      if (isAuthenticated) {
        // User is authenticated, redirect to home
        throw redirect({
          to: '/home',
          search: undefined,
          replace: true,
        })
      } else {
        // User is not authenticated, redirect to sign-in (landing page)
        throw redirect({
          to: '/sign-in',
          search: undefined,
          replace: true,
        })
      }
    }
  },
  component: () => {
    return (
      <>
        <NavigationProgress />
        <Outlet />
        <Toaster duration={5000} />
        {import.meta.env.MODE === 'development' && (
          <>
            <ReactQueryDevtools buttonPosition='bottom-left' />
            <TanStackRouterDevtools position='bottom-right' />
          </>
        )}
      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
