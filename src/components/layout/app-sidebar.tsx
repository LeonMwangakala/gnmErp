import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { getSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { CompanySwitcher } from './company-switcher'
import { useAuthStore } from '@/stores/auth-store'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const user = useAuthStore((s) => s.auth.user)
  const sidebarData = getSidebarData(user)
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <CompanySwitcher />

        {/* Replace <CompanySwitcher /> with the following <AppTitle />
         /* if you want to use the normal app title instead of Company Switcher dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
