import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ContentSection } from '../components/content-section'
import { type CompanyCurrencyRow, companyCurrencyApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function SettingsExchangeRates() {
  const [rows, setRows] = useState<CompanyCurrencyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [editTarget, setEditTarget] = useState<CompanyCurrencyRow | null>(null)
  const [exchangeRateInput, setExchangeRateInput] = useState('')
  const [saving, setSaving] = useState(false)

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const data = await companyCurrencyApi.list()
      setRows(data)
    } catch {
      // toast handled by interceptor
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.base === b.base) return a.currencyCode.localeCompare(b.currencyCode)
      return a.base ? -1 : 1
    })
  }, [rows])

  const openEditDialog = (row: CompanyCurrencyRow) => {
    setEditTarget(row)
    setExchangeRateInput(row.exchangeRate != null ? String(row.exchangeRate) : '')
  }

  const submitUpdate = async () => {
    if (!editTarget) return
    const parsed = Number(exchangeRateInput)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Exchange rate must be a valid number greater than 0.')
      return
    }

    setSaving(true)
    try {
      const updated = await companyCurrencyApi.updateExchangeRate(editTarget.currencyId, parsed)
      setRows((prev) =>
        prev.map((row) => (row.currencyId === updated.currencyId ? updated : row))
      )
      setEditTarget(null)
      toast.success('Exchange rate updated.')
    } catch {
      // toast handled by interceptor
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <ContentSection
        title='Exchange rates'
        desc='Update company currency exchange rates used for amount conversions.'
      >
        <div className='space-y-4'>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className='text-end'>Exchange Rate</TableHead>
                  <TableHead className='w-[90px] text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                      Loading currencies...
                    </TableCell>
                  </TableRow>
                ) : sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                      No company currencies found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRows.map((row) => (
                    <TableRow key={row.currencyId}>
                      <TableCell className='whitespace-normal'>
                        <div className='font-medium'>{row.currencyName || row.currencyCode}</div>
                        <div className='text-xs text-muted-foreground'>
                          {row.currencySymbol ? `Symbol: ${row.currencySymbol}` : 'No symbol'}
                          {row.base ? ' · Base currency' : ''}
                        </div>
                      </TableCell>
                      <TableCell className='font-mono'>{row.currencyCode || '—'}</TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {row.exchangeRate != null ? row.exchangeRate.toString() : '—'}
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => openEditDialog(row)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className='text-xs text-muted-foreground'>
            Rates are stored per company currency profile and used in pricing, invoicing, and
            conversion helpers.
          </p>
        </div>
      </ContentSection>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              Update exchange rate
              {editTarget ? ` · ${editTarget.currencyCode || editTarget.currencyName}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-2'>
            <p className='text-sm text-muted-foreground'>
              Enter the new exchange rate for this currency.
            </p>
            <Input
              type='number'
              step='0.000001'
              min='0'
              value={exchangeRateInput}
              onChange={(e) => setExchangeRateInput(e.target.value)}
              placeholder='e.g. 1.00'
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setEditTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type='button' onClick={() => void submitUpdate()} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
