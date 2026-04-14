import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  email: z.string().min(1, 'Please enter your email or phone number'),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(7, 'Password must be at least 7 characters long'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const response = await authApi.login(data.email, data.password)

      if (response.status === 200 && response.token) {
        // eslint-disable-next-line no-console -- debug: login API payload (users, employee_context, etc.)
        console.log('[login] result', {
          ...response,
          token: '[redacted]',
        })

        // Set access token
        auth.setAccessToken(response.token)

        // Set user data from Laravel response
        if (response.users) {
          auth.setUserFromLaravel(response.users)
        }

        toast.success(response.message || `Welcome back, ${response.users?.name || data.email}!`)

        // Redirect to home page
        // Use window.location for reliable navigation after login
        // This ensures the route tree is properly loaded and auth state is checked
        const targetPath = redirectTo && redirectTo !== '/sign-in' && redirectTo !== '/' 
          ? redirectTo 
          : '/home'
        
        // Small delay to ensure toast is visible and auth state is persisted
        setTimeout(() => {
          window.location.href = targetPath
        }, 300)
      } else {
        toast.error(response.message || 'Login failed. Please try again.')
        setIsLoading(false)
      }
    } catch (error: any) {
      // Error is already handled by axios interceptor, but we need to stop loading
      setIsLoading(false)
      
      // Show specific error message if available
      if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      }
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('space-y-5', className)}
        {...props}
      >
        <div className='space-y-4'>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-sm font-medium'>Email or Phone</FormLabel>
                <FormControl>
                  <Input 
                    placeholder='name@example.com' 
                    className='h-11'
                    autoComplete='email'
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center justify-between'>
                  <FormLabel className='text-sm font-medium'>Password</FormLabel>
                  <Link
                    to='/forgot-password'
                    className='text-xs font-medium text-primary hover:underline'
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput 
                    placeholder='Enter your password' 
                    className='h-11'
                    autoComplete='current-password'
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button 
          type='submit' 
          className='w-full h-11 text-base font-medium shadow-lg transition-all hover:shadow-xl' 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className='mr-2 h-4 w-4' />
              Sign in
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
