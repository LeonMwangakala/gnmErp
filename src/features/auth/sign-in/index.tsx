import { useSearch, Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl'>
        <CardContent className='pt-6'>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter className='flex flex-col space-y-4 border-t border-border/50 pt-6'>
          <p className='text-center text-xs text-muted-foreground'>
            By signing in, you agree to our{' '}
            <Link
              to='/terms'
              className='font-medium underline underline-offset-4 transition-colors hover:text-primary'
            >
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link
              to='/privacy'
              className='font-medium underline underline-offset-4 transition-colors hover:text-primary'
            >
              Privacy Policy
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
