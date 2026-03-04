import {
  Construction,
  LayoutDashboard,
  Monitor,
  Bug,
  ListTodo,
  FileX,
  HelpCircle,
  Lock,
  Bell,
  Package,
  Palette,
  ServerOff,
  Settings,
  Wrench,
  UserCog,
  UserX,
  Users,
  MessagesSquare,
  ShieldCheck,
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
  FileCheck,
  Store,
} from 'lucide-react'
import { ClerkLogo } from '@/assets/clerk-logo'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
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
      items: [
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
          title: 'Payment',
          icon: CreditCard,
          items: [
            {
              title: 'Payments',
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
      ],
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
