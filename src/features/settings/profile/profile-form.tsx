import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { getAvatarUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const profileFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required.')
    .min(2, 'Name must be at least 2 characters.')
    .max(255, 'Name must not be longer than 255 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: z
    .string()
    .min(1, 'Phone is required.')
    .max(20, 'Phone must not be longer than 20 characters.'),
  avatar: z.instanceof(File).optional().or(z.literal('')),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const { auth } = useAuthStore()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      avatar: undefined,
    },
    mode: 'onChange',
  })

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        const response = await authApi.getProfile()
        if (response.status === 200 && response.data) {
          const userData = response.data
          form.reset({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            avatar: undefined,
          })
          // Set avatar preview if exists
          if (userData.avatar) {
            const avatarUrl = getAvatarUrl(userData.avatar)
            if (avatarUrl) {
              setAvatarPreview(avatarUrl)
            }
          }
        }
      } catch (error: any) {
        toast.error('Failed to load profile: ' + (error?.response?.data?.message || error?.message || 'Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    void fetchProfile()
  }, [form])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      form.setValue('avatar', file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeAvatar = () => {
    form.setValue('avatar', '')
    setAvatarPreview(null)
  }

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSubmitting(true)
      const response = await authApi.updateProfile({
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar: data.avatar instanceof File ? data.avatar : undefined,
      })

      if (response.status === 200) {
        toast.success('Profile updated successfully')
        // Update auth store with new user data
        if (response.data) {
          useAuthStore.getState().auth.setUserFromLaravel(response.data)
        }
        // Refresh profile data
        const profileResponse = await authApi.getProfile()
        if (profileResponse.status === 200 && profileResponse.data) {
          const userData = profileResponse.data
          const avatarUrl = getAvatarUrl(userData.avatar)
          if (avatarUrl) {
            setAvatarPreview(avatarUrl)
          }
        }
      } else {
        toast.error(response.message || 'Failed to update profile')
      }
    } catch (error: any) {
      toast.error('Failed to update profile: ' + (error?.response?.data?.message || error?.message || 'Unknown error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        {/* Avatar Upload */}
        <div className='flex items-center gap-6'>
          <div className='relative'>
            <Avatar className='h-20 w-20'>
              <AvatarImage src={avatarPreview || auth.user?.avatar || undefined} alt={form.watch('name') || 'User'} />
              <AvatarFallback>
                {(form.watch('name') || auth.user?.name || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {avatarPreview && (
              <Button
                type='button'
                variant='destructive'
                size='icon'
                className='absolute -right-2 -top-2 h-6 w-6 rounded-full'
                onClick={removeAvatar}
              >
                <X className='h-3 w-3' />
              </Button>
            )}
          </div>
          <div className='space-y-2'>
            <FormField
              control={form.control}
              name='avatar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                  <FormControl>
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                      >
                        <Upload className='mr-2 h-4 w-4' />
                        Upload
                      </Button>
                      <Input
                        id='avatar-upload'
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={handleAvatarChange}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload a profile picture. Max size: 2MB. Supported formats: JPEG, PNG, JPG, GIF.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder='Your full name' {...field} />
              </FormControl>
              <FormDescription>
                This is your display name. It will be visible to other users.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type='email' placeholder='your.email@example.com' {...field} />
              </FormControl>
              <FormDescription>
                Your email address. This will be used for account notifications.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='phone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type='tel' placeholder='+255 123 456 789' {...field} />
              </FormControl>
              <FormDescription>
                Your phone number. This will be used for account verification and notifications.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          Update profile
        </Button>
      </form>
    </Form>
  )
}
