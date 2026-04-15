import {
  LayoutDashboard,
  Monitor,
  HelpCircle,
  Bell,
  Palette,
  Settings,
  Wrench,
  UserCog,
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  UserCircle,
  FileText,
  CreditCard,
  Receipt,
  FileMinus,
  Calculator,
  Building2,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  DollarSign,
  TrendingDown,
  Clipboard,
  Store,
  Anchor,
  BriefcaseBusiness,
  Ship,
  Route,
} from 'lucide-react'
import { type SidebarData } from '../types'

type AuthUserLike = {
  type?: string
  role?: string[]
  employee_context?: {
    department_name?: string | null
  } | null
} | null

function isAdminUser(user: AuthUserLike): boolean {
  if (!user) return false
  const roleList = Array.isArray(user.role) ? user.role : []
  const type = (user.type || '').toLowerCase()

  return (
    roleList.includes('admin') ||
    type === 'admin' ||
    type === 'owner' ||
    type === 'super admin' ||
    type === 'company'
  )
}

function isCustomsDepartmentUser(user: AuthUserLike): boolean {
  const dept = (user?.employee_context?.department_name || '').trim().toLowerCase()

  return dept.includes('custom')
}

export function getSidebarData(user?: AuthUserLike): SidebarData {
  const customsItems = [
    {
      title: 'Customs Dashboard',
      url: '/customs/dashboard',
      icon: Anchor,
    },
    {
      title: 'Jobs',
      url: '/customs/jobs',
      icon: BriefcaseBusiness,
    },
    {
      title: 'Vessels',
      url: '/customs/vessels',
      icon: Ship,
    },
    {
      title: 'Vessel Voyage',
      url: '/customs/vessel-voyage',
      icon: Route,
    },
  ]

  const admin = isAdminUser(user || null)
  const customsDepartment = isCustomsDepartmentUser(user || null)
  const customsOnly = customsDepartment && !admin

  const generalItems = customsOnly
    ? [
        customsItems[0],
        {
          title: 'Customers',
          url: '/customers',
          icon: UserCircle,
        },
        {
          title: 'Vendors',
          url: '/vendors',
          icon: Store,
        },
        customsItems[1],
        customsItems[2],
        customsItems[3],
      ]
    : [
        {
          title: 'Dashboard',
          url: '/home',
          icon: LayoutDashboard,
        },
        {
          title: 'Customers',
          url: '/customers',
          icon: UserCircle,
        },
        {
          title: 'Vendors',
          url: '/vendors',
          icon: Store,
        },
        {
          title: 'Invoices',
          url: '/invoices',
          icon: FileText,
        },
        {
          title: 'Customs',
          icon: Anchor,
          items: customsItems,
        },
        {
          title: 'Payment',
          icon: CreditCard,
          items: [
            {
              title: 'Receive Payments',
              url: '/payments',
              icon: Receipt,
            },
            {
              title: 'Credit Notes',
              url: '/credit-notes',
              icon: FileMinus,
            },
          ],
        },
        {
          title: 'Accounting',
          icon: Calculator,
          items: [
            {
              title: 'Banking',
              icon: Building2,
              items: [
                {
                  title: 'Account',
                  url: '/accounting/banking/account',
                  icon: Wallet,
                },
                {
                  title: 'Transfer',
                  url: '/accounting/banking/transfer',
                  icon: ArrowLeftRight,
                },
              ],
            },
            {
              title: 'Income',
              icon: TrendingUp,
              items: [
                {
                  title: 'Revenue',
                  url: '/accounting/income/revenue',
                  icon: DollarSign,
                },
              ],
            },
            {
              title: 'Expenses',
              icon: TrendingDown,
              items: [
                {
                  title: 'Bills',
                  url: '/accounting/expenses/bills',
                  icon: FileText,
                },
                {
                  title: 'Payments',
                  url: '/accounting/expenses/payments',
                  icon: CreditCard,
                },
                {
                  title: 'Debit Notes',
                  url: '/accounting/expenses/debit-notes',
                  icon: FileMinus,
                },
                {
                  title: 'Petty Cash Requests',
                  url: '/accounting/expenses/petty-cash-requests',
                  icon: Clipboard,
                },
                {
                  title: 'Petty Cash',
                  url: '/accounting/expenses/petty-cash',
                  icon: Wallet,
                },
              ],
            },
          ],
        },
      ]

  return {
  user: {
    name: 'satnaing',
    email: 'satnaingdev@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'ERP System',
      logo: Command,
      plan: 'Enterprise Resource Planning',
    },
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: generalItems,
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'Display',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}

}

export const sidebarData: SidebarData = getSidebarData(null)
