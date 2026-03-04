import { useMemo } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { TopNav } from '@/components/layout/top-nav'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'

export function AppHeader() {
  const { pathname } = useLocation()

  const topNav = useMemo(() => {
    const currentPath = pathname || ''
    return [
      {
        title: 'Overview',
        href: '/home',
        isActive: currentPath === '/home',
        disabled: false,
      },
      {
        title: 'Customers',
        href: '/customers',
        isActive: currentPath.startsWith('/customers'),
        disabled: false,
      },
      {
        title: 'Invoices',
        href: '/invoices',
        isActive: currentPath.startsWith('/invoices'),
        disabled: false,
      },
      {
        title: 'Settings',
        href: '/settings',
        isActive: currentPath.startsWith('/settings') || currentPath.startsWith('/_authenticated/settings'),
        disabled: false,
      },
    ]
  }, [pathname])

  return (
    <Header>
      <TopNav links={topNav} />
      <div className='ms-auto flex items-center space-x-4'>
        <Search />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </div>
    </Header>
  )
}
