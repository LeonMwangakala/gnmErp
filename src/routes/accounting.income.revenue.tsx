import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { Revenues } from '@/features/revenues'

export const Route = createFileRoute('/accounting/income/revenue')({
  component: AccountingIncomeRevenuePage,
})

function AccountingIncomeRevenuePage() {
  return (
    <AuthenticatedLayout>
      <Revenues />
    </AuthenticatedLayout>
  )
}
