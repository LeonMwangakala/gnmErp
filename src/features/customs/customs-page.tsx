import { type ReactNode } from 'react'
import { Main } from '@/components/layout/main'

type CustomsPageProps = {
  title: string
  description: string
  headerActions?: ReactNode
  children?: ReactNode
}

export function CustomsPage({
  title,
  description,
  headerActions,
  children,
}: CustomsPageProps) {
  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
          <p className='text-muted-foreground'>{description}</p>
        </div>
        {headerActions ? <div>{headerActions}</div> : null}
      </div>
      {children}
    </Main>
  )
}
