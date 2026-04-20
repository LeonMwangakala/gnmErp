import { createFileRoute } from '@tanstack/react-router'
import { SettingsExchangeRates } from '@/features/settings/exchange-rates'

export const Route = createFileRoute('/_authenticated/settings/exchange-rates')({
  component: SettingsExchangeRates,
})
