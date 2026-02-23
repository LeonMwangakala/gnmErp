type PublicContentLayoutProps = {
  children: React.ReactNode
}

export function PublicContentLayout({ children }: PublicContentLayoutProps) {
  return (
    <div className='container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8'>
      <div className='mb-6 flex items-center justify-center'>
        <img 
          src='/images/gnm_cargo.png' 
          alt='GNM Cargo Logo' 
          className='me-2 h-8 w-auto'
        />
        <h1 className='text-xl font-medium'>ERP System</h1>
      </div>
      <div className='mx-auto max-w-3xl'>
        {children}
      </div>
    </div>
  )
}
