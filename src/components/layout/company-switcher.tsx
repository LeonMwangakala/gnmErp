import * as React from 'react'
import { ChevronsUpDown, Building2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth-store'
import { companyApi } from '@/lib/api'
import { toast } from 'sonner'

export interface Company {
  key: string
  name: string
  email: string
}

type CompanySwitcherProps = {
  companies?: Company[]
}

export function CompanySwitcher({ companies = [] }: CompanySwitcherProps) {
  const { isMobile } = useSidebar()
  const { auth } = useAuthStore()
  const [activeCompany, setActiveCompany] = React.useState<Company | null>(null)
  const [availableCompanies, setAvailableCompanies] = React.useState<Company[]>(companies)
  const [isLoading, setIsLoading] = React.useState(false)

  // Get current company from user email
  React.useEffect(() => {
    if (auth.user?.email) {
      const emailDomain = auth.user.email.split('@')[1]
      const currentCompany = availableCompanies.find(
        (company) => company.email.split('@')[1] === emailDomain
      )
      if (currentCompany) {
        // Company switcher shows the logged-in user's email,
        // while keeping the matched company name/key for display and switching.
        setActiveCompany({ ...currentCompany, email: auth.user.email })
      } else {
        // If no match found, use first company or create from email
        const companyName = emailDomain.split('.')[0].toUpperCase()
        setActiveCompany({
          key: companyName.toLowerCase(),
          name: `${companyName} CO., LTD`,
          email: auth.user.email,
        })
      }
    }
  }, [auth.user?.email, availableCompanies])

  // Fetch companies if not provided
  React.useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies()
    }
  }, [])

  const fetchCompanies = async () => {
    try {
      const companiesData = await companyApi.getCompanies()
      setAvailableCompanies(companiesData)
    } catch (error) {
      console.error('Failed to fetch companies:', error)
      // Use default companies if API fails
      setAvailableCompanies([
        { key: 'sgs', name: 'SGS CO., LTD', email: 'admin@sgs.com' },
        { key: 'kikarara', name: 'KIKARARA CO., LTD', email: 'admin@kikarara.com' },
        { key: 'madiluu', name: 'MADILUU CO., LTD', email: 'admin@madiluu.com' },
      ])
    }
  }

  const handleCompanySwitch = async (company: Company) => {
    if (activeCompany?.key === company.key) {
      return // Already on this company
    }

    setIsLoading(true)
    try {
      await companyApi.switchCompany(company.key)
      toast.success(`Switched to ${company.name}`)
      
      // Reload the page to refresh auth state
      setTimeout(() => {
        window.location.href = '/home'
      }, 500)
    } catch (error: any) {
      setIsLoading(false)
      const errorMessage = error.response?.data?.message || 'Failed to switch company'
      toast.error(errorMessage)
    }
  }

  if (!activeCompany) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              disabled={isLoading}
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                <Building2 className='size-4' />
              </div>
              <div className='grid flex-1 text-start text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {activeCompany.name}
                </span>
                <span className='truncate text-xs text-muted-foreground'>
                  {activeCompany.email}
                </span>
              </div>
              <ChevronsUpDown className='ms-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Companies
            </DropdownMenuLabel>
            {availableCompanies.map((company) => (
              <DropdownMenuItem
                key={company.key}
                onClick={() => handleCompanySwitch(company)}
                className='gap-2 p-2'
                disabled={isLoading || activeCompany.key === company.key}
              >
                <div className='flex size-6 items-center justify-center rounded-sm border'>
                  <Building2 className='size-4 shrink-0' />
                </div>
                <div className='flex flex-col'>
                  <span className='font-medium'>{company.name}</span>
                  <span className='text-xs text-muted-foreground'>{company.email}</span>
                </div>
                {activeCompany.key === company.key && (
                  <span className='ms-auto text-xs text-muted-foreground'>Current</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
