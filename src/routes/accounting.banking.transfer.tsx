import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { BankTransfers } from '@/features/bank-transfers'

export const Route = createFileRoute('/accounting/banking/transfer')({
  component: AccountingBankingTransferPage,
})

function AccountingBankingTransferPage() {
  return (
    <AuthenticatedLayout>
      <BankTransfers />
    </AuthenticatedLayout>
  )
}
