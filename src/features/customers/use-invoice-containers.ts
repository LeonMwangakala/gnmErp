import { useEffect, useState } from 'react'
import { invoiceApi } from '@/lib/api'

export type InvoiceRef = { id: number; invoice_number: string }

/** Stable empty list — avoid `[]` inline in parents (new reference each render). */
export const EMPTY_INVOICE_REFS: InvoiceRef[] = []

/**
 * For each invoice, loads container number(s) from the source system
 * (same API as invoice detail modal → Containers tab).
 */
export function useInvoiceContainers(invoices: InvoiceRef[] | null | undefined) {
  const [containerByInvoiceId, setContainerByInvoiceId] = useState<Record<number, string>>({})
  const [containersLoading, setContainersLoading] = useState(false)

  useEffect(() => {
    if (!invoices?.length) {
      setContainerByInvoiceId({})
      setContainersLoading(false)
      return
    }

    let cancelled = false
    setContainersLoading(true)

    ;(async () => {
      const entries = await Promise.all(
        invoices.map(async (inv) => {
          try {
            const resp = await invoiceApi.getInvoiceContainerDetails(inv.invoice_number)
            if (resp?.status && Array.isArray(resp.containers) && resp.containers.length > 0) {
              const text = resp.containers
                .map((c: { container_no?: string }) => String(c.container_no ?? '').trim())
                .filter(Boolean)
                .join(', ')
              return [inv.id, text || '-'] as const
            }
          } catch {
            // 404 / network: treat as no container data
          }
          return [inv.id, '-'] as const
        })
      )

      if (!cancelled) {
        setContainerByInvoiceId(Object.fromEntries(entries))
        setContainersLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [invoices])

  return { containerByInvoiceId, containersLoading }
}
