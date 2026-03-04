import { useState, useMemo } from 'react'
import { Search, BookOpen, Users, FileText, CreditCard, Calculator, Settings, HelpCircle, MessageCircle, ExternalLink, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Main } from '@/components/layout/main'

interface HelpCategory {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  articles: HelpArticle[]
}

interface HelpArticle {
  id: string
  title: string
  content: string
  tags: string[]
}

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of using Torchlight',
    icon: BookOpen,
    color: 'bg-blue-500',
    articles: [
      {
        id: 'welcome',
        title: 'Welcome to Torchlight',
        content: 'Torchlight is a comprehensive business management system designed to help you manage your customers, vendors, invoices, payments, and accounting all in one place. Start by exploring the Dashboard to get an overview of your business metrics.',
        tags: ['introduction', 'overview'],
      },
      {
        id: 'dashboard-overview',
        title: 'Understanding the Dashboard',
        content: 'The Dashboard provides a quick overview of your business performance. You can see total revenue, expenses, open invoices, and customer count for the current month. Use the Overview, Analytics, and Reports tabs to dive deeper into your data.',
        tags: ['dashboard', 'metrics'],
      },
      {
        id: 'navigation',
        title: 'Navigating the Application',
        content: 'Use the sidebar menu to navigate between different sections. The top navigation bar provides quick access to Overview, Customers, Invoices, and Settings. You can customize which items appear in the sidebar from Settings > Display.',
        tags: ['navigation', 'sidebar'],
      },
    ],
  },
  {
    id: 'customers-vendors',
    title: 'Customers & Vendors',
    description: 'Manage your customer and vendor relationships',
    icon: Users,
    color: 'bg-green-500',
    articles: [
      {
        id: 'add-customer',
        title: 'How to Add a New Customer',
        content: 'Navigate to Customers from the sidebar or top menu. Click the "Create" button to add a new customer. Fill in the required information including name, email, phone, and tax number. You can also add additional details like address and notes.',
        tags: ['customers', 'create'],
      },
      {
        id: 'manage-vendors',
        title: 'Managing Vendors',
        content: 'Vendors are suppliers or service providers you work with. Add vendors from the Vendors page, and you can link them to bills and expense payments. Keep vendor information up to date to ensure accurate expense tracking.',
        tags: ['vendors', 'suppliers'],
      },
      {
        id: 'customer-details',
        title: 'Viewing Customer Details',
        content: 'Click on any customer from the Customers list to view their detailed information, including contact details, invoices, payment history, and current balance. This helps you track all interactions with each customer.',
        tags: ['customers', 'details'],
      },
    ],
  },
  {
    id: 'invoicing',
    title: 'Invoicing',
    description: 'Create and manage invoices',
    icon: FileText,
    color: 'bg-purple-500',
    articles: [
      {
        id: 'create-invoice',
        title: 'Creating an Invoice',
        content: 'Go to Invoices and click "Create" to add a new invoice. Select a customer, add line items with products or services, set quantities and prices. The system will automatically calculate totals including tax. Set the issue date and due date, then save the invoice.',
        tags: ['invoices', 'create'],
      },
      {
        id: 'invoice-status',
        title: 'Understanding Invoice Status',
        content: 'Invoices can have different statuses: Unpaid (status 2), Partial Paid (status 3), or Paid (status 4). The status updates automatically as payments are recorded. You can filter invoices by status to see which ones need attention.',
        tags: ['invoices', 'status'],
      },
      {
        id: 'view-invoice',
        title: 'Viewing Invoice Details',
        content: 'Click on any invoice from the list to view full details including line items, tax breakdown, payment history, and credit notes. You can also export invoices as PDF or Excel from the invoice detail view.',
        tags: ['invoices', 'details'],
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    description: 'Track invoice and expense payments',
    icon: CreditCard,
    color: 'bg-orange-500',
    articles: [
      {
        id: 'record-payment',
        title: 'Recording Invoice Payments',
        content: 'Navigate to Payments and click "Create" to record a payment against an invoice. Select the invoice, enter the payment amount, date, and payment method. The system will update the invoice status automatically based on the payment amount.',
        tags: ['payments', 'invoice'],
      },
      {
        id: 'credit-notes',
        title: 'Creating Credit Notes',
        content: 'Credit notes are used to issue refunds or adjustments to customers. Go to Credit Notes and create a new credit note linked to the original invoice. Credit notes reduce the customer\'s outstanding balance.',
        tags: ['credit-notes', 'refunds'],
      },
      {
        id: 'expense-payments',
        title: 'Recording Expense Payments',
        content: 'Track payments made to vendors by going to Accounting > Expenses > Payments. Record payments for bills, services, or other expenses. Link payments to specific vendors and expense categories for better tracking.',
        tags: ['expenses', 'payments'],
      },
    ],
  },
  {
    id: 'accounting',
    title: 'Accounting',
    description: 'Manage your financial records',
    icon: Calculator,
    color: 'bg-indigo-500',
    articles: [
      {
        id: 'bank-accounts',
        title: 'Managing Bank Accounts',
        content: 'Add and manage your bank accounts from Accounting > Banking > Account. Set up multiple accounts, track balances, and assign currencies. Bank accounts are used for recording transfers and tracking cash flow.',
        tags: ['banking', 'accounts'],
      },
      {
        id: 'revenue',
        title: 'Recording Revenue',
        content: 'Record income from Accounting > Income > Revenue. Add revenue entries with dates, amounts, accounts, customers, and categories. Revenue entries help you track all income sources separately from invoice payments.',
        tags: ['revenue', 'income'],
      },
      {
        id: 'bills',
        title: 'Managing Bills',
        content: 'Create bills for vendor invoices and expenses from Accounting > Expenses > Bills. Bills help you track what you owe to vendors. Record bill payments separately to maintain accurate accounts payable records.',
        tags: ['bills', 'expenses'],
      },
      {
        id: 'petty-cash',
        title: 'Petty Cash Management',
        content: 'Manage petty cash requests and expenses. Employees can submit petty cash requests that require approval. Once approved, record petty cash expenses. This helps track small cash transactions and maintain proper controls.',
        tags: ['petty-cash', 'cash'],
      },
      {
        id: 'bank-transfers',
        title: 'Bank Transfers',
        content: 'Record transfers between bank accounts from Accounting > Banking > Transfer. This helps maintain accurate balances across all your accounts and provides a complete audit trail of money movements.',
        tags: ['banking', 'transfers'],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Customize your account and preferences',
    icon: Settings,
    color: 'bg-gray-500',
    articles: [
      {
        id: 'profile-settings',
        title: 'Updating Your Profile',
        content: 'Go to Settings > Profile to update your personal information including name, email, phone, and profile picture. Your profile information is used throughout the application and in communications with customers.',
        tags: ['profile', 'account'],
      },
      {
        id: 'display-settings',
        title: 'Customizing Sidebar Display',
        content: 'From Settings > Display, you can choose which items appear in the sidebar. Uncheck items you don\'t use frequently to keep your sidebar clean and focused on what matters most to you.',
        tags: ['display', 'sidebar'],
      },
      {
        id: 'appearance',
        title: 'Appearance Settings',
        content: 'Customize the look and feel of the application from Settings > Appearance. Adjust themes, colors, and other visual preferences to match your preferences.',
        tags: ['appearance', 'theme'],
      },
    ],
  },
]

const faqs = [
  {
    question: 'How do I export my data?',
    answer: 'Most pages in the application have an Export button that allows you to download data as Excel or PDF. Look for the Export button in the top right corner of list pages like Customers, Invoices, and Payments.',
  },
  {
    question: 'Can I customize invoice templates?',
    answer: 'Invoice templates can be customized through the Settings. Contact your administrator for template customization options.',
  },
  {
    question: 'How do I track overdue invoices?',
    answer: 'The Dashboard shows open invoices and their amounts. You can also filter invoices by status on the Invoices page. Invoices past their due date are automatically marked as overdue.',
  },
  {
    question: 'What is the difference between Revenue and Invoice Payments?',
    answer: 'Revenue entries are used to record income that may not be tied to a specific invoice (like cash sales or other income). Invoice Payments are payments received against specific invoices you\'ve created.',
  },
  {
    question: 'How do I handle partial payments?',
    answer: 'When recording a payment that is less than the invoice total, the system automatically updates the invoice status to "Partial Paid". You can record multiple payments against the same invoice until it\'s fully paid.',
  },
  {
    question: 'Can I use multiple currencies?',
    answer: 'Yes, you can set up multiple currencies in your bank accounts and transactions. The system will track exchange rates and convert amounts as needed.',
  },
]

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return helpCategories
    }

    const query = searchQuery.toLowerCase()
    return helpCategories.map((category) => {
      const filteredArticles = category.articles.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query) ||
          article.tags.some((tag) => tag.toLowerCase().includes(query))
      )
      return { ...category, articles: filteredArticles }
    }).filter((category) => category.articles.length > 0)
  }, [searchQuery])

  const selectedCategoryData = selectedCategory
    ? helpCategories.find((cat) => cat.id === selectedCategory)
    : null

  return (
    <Main>
      <div className='space-y-6'>
        {/* Header */}
        <div className='space-y-2'>
          <h1 className='text-3xl font-bold tracking-tight'>Help Center</h1>
          <p className='text-muted-foreground'>
            Find answers to common questions and learn how to use Torchlight effectively.
          </p>
        </div>

        {/* Search */}
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search for help articles...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>

        {selectedCategoryData ? (
          /* Category Detail View */
          <div className='space-y-4'>
            <Button
              variant='ghost'
              onClick={() => setSelectedCategory(null)}
              className='-ml-2'
            >
              <ChevronRight className='mr-2 h-4 w-4 rotate-180' />
              Back to Categories
            </Button>
            <Card>
              <CardHeader>
                <div className='flex items-center gap-3'>
                  <div className={`rounded-lg p-2 ${selectedCategoryData.color} text-white`}>
                    <selectedCategoryData.icon className='h-5 w-5' />
                  </div>
                  <div>
                    <CardTitle>{selectedCategoryData.title}</CardTitle>
                    <CardDescription>{selectedCategoryData.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                {selectedCategoryData.articles.map((article) => (
                  <Card key={article.id} className='border-l-4 border-l-primary'>
                    <CardHeader>
                      <CardTitle className='text-lg'>{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className='text-muted-foreground'>{article.content}</p>
                      <div className='mt-3 flex flex-wrap gap-2'>
                        {article.tags.map((tag) => (
                          <Badge key={tag} variant='secondary' className='text-xs'>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Categories Grid */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {filteredCategories.map((category) => (
                <Card
                  key={category.id}
                  className='cursor-pointer transition-all hover:shadow-md hover:border-primary/50'
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardHeader>
                    <div className='flex items-center gap-3'>
                      <div className={`rounded-lg p-2 ${category.color} text-white`}>
                        <category.icon className='h-5 w-5' />
                      </div>
                      <div className='flex-1'>
                        <CardTitle className='text-lg'>{category.title}</CardTitle>
                        <CardDescription className='text-xs'>
                          {category.articles.length} articles
                        </CardDescription>
                      </div>
                      <ChevronRight className='h-4 w-4 text-muted-foreground' />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>{category.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* FAQs */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <HelpCircle className='h-5 w-5' />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>
                  Common questions and answers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type='single' collapsible className='w-full'>
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className='text-left'>
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className='text-muted-foreground'>
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <MessageCircle className='h-5 w-5' />
                  Need More Help?
                </CardTitle>
                <CardDescription>
                  Can't find what you're looking for? We're here to help.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <Button variant='outline' className='w-full justify-start' asChild>
                  <a href='mailto:support@torchlight.africa' target='_blank' rel='noopener noreferrer'>
                    <MessageCircle className='mr-2 h-4 w-4' />
                    Contact Support
                    <ExternalLink className='ml-auto h-4 w-4' />
                  </a>
                </Button>
                <Button variant='outline' className='w-full justify-start' asChild>
                  <a href='https://torchlight.africa/docs' target='_blank' rel='noopener noreferrer'>
                    <BookOpen className='mr-2 h-4 w-4' />
                    View Documentation
                    <ExternalLink className='ml-auto h-4 w-4' />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Main>
  )
}
