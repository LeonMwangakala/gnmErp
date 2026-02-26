import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { BankAccounts } from '@/features/bank-accounts'

export const Route = createFileRoute('/accounting/banking/account')({
  component: AccountingBankingAccountPage,
})

function AccountingBankingAccountPage() {
  return (
    <AuthenticatedLayout>
      <BankAccounts />
    </AuthenticatedLayout>
  )
}
