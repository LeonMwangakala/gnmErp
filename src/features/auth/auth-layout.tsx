type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div 
      className='relative grid min-h-svh w-full items-center justify-center bg-cover bg-center bg-no-repeat'
      style={{
        backgroundImage: 'url(/images/background.jpg)',
      }}
    >
      {/* Gradient overlay for better contrast */}
      <div className='absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95' />
      
      {/* Subtle pattern overlay */}
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255_/_0.05)_1px,transparent_0)] bg-[length:20px_20px] opacity-50' />
      
      {/* Main content */}
      <div className='relative z-10 w-full px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mx-auto w-full max-w-md'>
          {/* Logo and branding */}
          <div className='mb-8 flex flex-col items-center space-y-4'>
            <div className='flex items-center justify-center space-x-3'>
              <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-4 ring-primary/5'>
                <img 
                  src='/images/gnm_cargo.png' 
                  alt='GNM Cargo Logo' 
                  className='h-8 w-auto'
                />
              </div>
            </div>
            <div className='text-center'>
              <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                ERP System
              </h1>
              <p className='mt-1 text-sm text-muted-foreground'>
                Welcome back! Please sign in to continue.
              </p>
            </div>
          </div>
          
          {/* Form content */}
          <div className='w-full'>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
