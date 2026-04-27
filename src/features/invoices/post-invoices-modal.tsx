import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { invoiceApi } from '@/lib/api'

type SourceInvoice = {
  invoice_no: string
  customer_name: string
  description: string
  source_amount: number
}

type TorchlightInvoiceDetails = {
  id: number
  invoice_number: string
  subject: string
  customer: { name: string }
  amount: number
  amount_formatted: string
  status: number
  status_label?: string
  is_overdue?: boolean
}

type Row = {
  source: SourceInvoice
  torchlight: TorchlightInvoiceDetails | null
  selected: boolean
  mismatch: boolean
  syncAttempted?: boolean
  syncFailed?: boolean
  syncMessage?: string
}

/** Draft (0) and overdue invoices are postable in this flow. */
function isRowPostable(row: Row): boolean {
  return (
    row.torchlight !== null &&
    (row.torchlight.status === 0 || Boolean(row.torchlight.is_overdue))
  )
}

function roundOffAmount(value: number | null | undefined): number {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.round(amount)
}

function getSyncFailureMessage(syncResp: any): string {
  const rawMessage = String(syncResp?.message || '').trim()
  const lower = rawMessage.toLowerCase()
  if (lower.includes('cancel') && lower.includes('bill')) {
    return 'Cannot sync this invoice because the source bill was canceled.'
  }
  return rawMessage || 'Failed to sync invoice to ERP'
}

function isCancelledBillSyncError(syncResp: any): boolean {
  const msg = String(syncResp?.message || syncResp?.error || '').toLowerCase()
  return msg.includes('cannot post cancelled bill')
}

function isAlreadyExistsSyncError(syncResp: any): boolean {
  const msg = String(syncResp?.message || syncResp?.error || '').toLowerCase()
  return msg.includes('already exists')
}

export function PostInvoicesModal({
  open,
  onOpenChange,
  onPosted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPosted?: () => Promise<void> | void
}) {
  const [containerNo, setContainerNo] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [syncingInvoiceNos, setSyncingInvoiceNos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open) {
      setContainerNo('')
      setRows([])
      setIsFetching(false)
      setIsSubmitting(false)
      setSyncingInvoiceNos({})
    }
  }, [open])

  const postableRows = useMemo(() => rows.filter(isRowPostable), [rows])
  const missingRows = useMemo(() => rows.filter((r) => !r.torchlight), [rows])

  const selectedCount = useMemo(
    () => rows.filter((r) => r.selected && isRowPostable(r)).length,
    [rows]
  )
  const mismatchCount = useMemo(
    () => rows.filter((r) => r.mismatch).length,
    [rows]
  )
  const selectedMismatchCount = useMemo(
    () => rows.filter((r) => r.selected && isRowPostable(r) && r.mismatch).length,
    [rows]
  )

  const allSelected =
    postableRows.length > 0 && postableRows.every((r) => r.selected)

  const formatSourceAmount = (n: number) => {
    if (typeof n !== 'number' || Number.isNaN(n)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  }

  const loadInvoicesForContainer = async () => {
    const trimmed = containerNo.trim()
    if (!trimmed) {
      toast.error('Container number is required.')
      return
    }

    try {
      setIsFetching(true)
      setRows([])

      const sourceResp = await invoiceApi.getInvoiceNosByContainer(trimmed)
      const sourceInvoices: SourceInvoice[] = sourceResp?.invoices || []

      if (!sourceInvoices || sourceInvoices.length === 0) {
        toast.error('No invoices found for this container.')
        return
      }

      // Fetch torchlight invoice details for each invoice number
      const torchlightResults = await Promise.all(
        sourceInvoices.map(async (inv) => {
          try {
            const torch = await invoiceApi.getInvoiceByInvoiceNumber(inv.invoice_no)
            return { source: inv, torchlight: torch as TorchlightInvoiceDetails, syncAttempted: false, syncFailed: false, syncMessage: '' }
          } catch (e) {
            return { source: inv, torchlight: null, syncAttempted: false, syncFailed: false, syncMessage: '' }
          }
        })
      )

      const nextRows: Row[] = torchlightResults.map((res) => {
        const torchAmount = res.torchlight?.amount ?? null
        const sourceAmount = roundOffAmount(res.source.source_amount)

        const mismatch =
          torchAmount === null
            ? false
            : roundOffAmount(torchAmount) !== sourceAmount

        const row: Row = {
          source: res.source,
          torchlight: res.torchlight,
          selected: false,
          mismatch,
          syncAttempted: res.syncAttempted,
          syncFailed: res.syncFailed,
          syncMessage: res.syncMessage,
        }
        return {
          ...row,
          selected: isRowPostable(row),
        }
      })

      setRows(nextRows)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load invoices for container.')
    } finally {
      setIsFetching(false)
    }
  }

  const toggleRow = (index: number, value: boolean) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r
        if (!isRowPostable(r)) return { ...r, selected: false }
        return { ...r, selected: value }
      })
    )
  }

  const toggleAll = (value: boolean) => {
    setRows((prev) =>
      prev.map((r) =>
        isRowPostable(r) ? { ...r, selected: value } : { ...r, selected: false }
      )
    )
  }

  const handleSubmit = async () => {
    const selectedRows = rows.filter((r) => r.selected && isRowPostable(r))
    const selectedIds = selectedRows.map((r) => r.torchlight!.id)

    if (selectedIds.length === 0) {
      toast.error('No invoices selected to post.')
      return
    }

    try {
      setIsSubmitting(true)

      // Align mismatched selected draft invoices to source amount before posting.
      const mismatches = selectedRows.filter((r) => r.mismatch && r.torchlight)
      if (mismatches.length > 0) {
        let updatedCount = 0
        for (const row of mismatches) {
          const resp = await invoiceApi.syncSourceAmount(
            row.source.invoice_no,
            roundOffAmount(row.source.source_amount)
          )
          if (resp?.status === 200) {
            updatedCount += 1
          } else {
            throw new Error(
              resp?.message ||
                `Failed to sync amount for ${row.source.invoice_no}`
            )
          }
        }

        // Refresh updated invoice totals for accurate mismatch rendering.
        const refreshed = await Promise.all(
          rows.map(async (r) => {
            if (!r.torchlight) return r
            try {
              const torch = await invoiceApi.getInvoiceByInvoiceNumber(r.source.invoice_no)
              const nextTorch = torch as TorchlightInvoiceDetails
              const mismatch =
                roundOffAmount(r.source.source_amount) !==
                roundOffAmount(nextTorch.amount)
              return { ...r, torchlight: nextTorch, mismatch }
            } catch {
              return r
            }
          })
        )
        setRows(refreshed)
        if (updatedCount > 0) {
          toast.success(`Updated ${updatedCount} mismatched invoice amount(s).`)
        }
      }

      const response = await invoiceApi.bulkPost(selectedIds, {
        container_no: containerNo.trim(),
      })

      if (response.status === 200) {
        toast.success(
          `Successfully posted ${response.data.posted_count} invoice(s). ${
            response.data.skipped_count > 0 ? `${response.data.skipped_count} skipped.` : ''
          }`
        )
        await onPosted?.()
        onOpenChange(false)
      } else {
        toast.error(response.message || 'Failed to post invoices')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to post invoices')
    } finally {
      setIsSubmitting(false)
    }
  }

  const retrySyncRow = async (invoiceNo: string) => {
    setSyncingInvoiceNos((prev) => ({ ...prev, [invoiceNo]: true }))
    try {
      const syncResp = await invoiceApi.syncInvoiceToERPByInvoiceNumber(invoiceNo, true)
      const syncOk =
        syncResp &&
        syncResp.status === true &&
        (syncResp.synced === true || syncResp.already_posted_to_erp === true)

      if (!syncOk && !isAlreadyExistsSyncError(syncResp)) {
        if (isCancelledBillSyncError(syncResp)) {
          setRows((prev) => prev.filter((r) => r.source.invoice_no !== invoiceNo))
          toast.info(`Invoice ${invoiceNo} was cancelled in source and was removed from posting list.`)
          return
        }
        const failureMessage = getSyncFailureMessage(syncResp)
        setRows((prev) =>
          prev.map((r) =>
            r.source.invoice_no === invoiceNo
              ? {
                  ...r,
                  syncAttempted: true,
                  syncFailed: true,
                  syncMessage: failureMessage,
                }
              : r
          )
        )
        toast.error(failureMessage)
        return
      }

      try {
        const torch = await invoiceApi.getInvoiceByInvoiceNumber(invoiceNo)
        const torchlight = torch as TorchlightInvoiceDetails
        setRows((prev) =>
          prev.map((r) => {
            if (r.source.invoice_no !== invoiceNo) return r
            const mismatch =
              roundOffAmount(r.source.source_amount) !==
              roundOffAmount(torchlight.amount)
            const updated: Row = {
              ...r,
              torchlight,
              mismatch,
              syncAttempted: true,
              syncFailed: false,
              syncMessage: '',
            }
            return { ...updated, selected: isRowPostable(updated) ? updated.selected || true : false }
          })
        )
        toast.success(`Invoice ${invoiceNo} synced successfully.`)
      } catch (e) {
        setRows((prev) =>
          prev.map((r) =>
            r.source.invoice_no === invoiceNo
              ? {
                  ...r,
                  syncAttempted: true,
                  syncFailed: true,
                  syncMessage:
                    'Sync request completed, but invoice is still not available in Torchlight yet',
                }
              : r
          )
        )
        if (isAlreadyExistsSyncError(syncResp)) {
          toast.error(`Invoice ${invoiceNo} exists in source but is still not found in Torchlight.`)
        } else {
          toast.error(`Invoice ${invoiceNo} not found in Torchlight yet. Try again shortly.`)
        }
      }
    } finally {
      setSyncingInvoiceNos((prev) => ({ ...prev, [invoiceNo]: false }))
    }
  }

  const syncMissingInvoices = async () => {
    const targets = rows.filter((r) => !r.torchlight).map((r) => r.source.invoice_no)
    if (targets.length === 0) return

    let syncedCount = 0
    for (const invoiceNo of targets) {
      setSyncingInvoiceNos((prev) => ({ ...prev, [invoiceNo]: true }))
      try {
        const syncResp = await invoiceApi.syncInvoiceToERPByInvoiceNumber(invoiceNo, true)
        const syncOk =
          syncResp &&
          syncResp.status === true &&
          (syncResp.synced === true || syncResp.already_posted_to_erp === true)
        if (!syncOk && !isAlreadyExistsSyncError(syncResp)) {
          if (isCancelledBillSyncError(syncResp)) {
            setRows((prev) => prev.filter((r) => r.source.invoice_no !== invoiceNo))
            continue
          }
          const failureMessage = getSyncFailureMessage(syncResp)
          setRows((prev) =>
            prev.map((r) =>
              r.source.invoice_no === invoiceNo
                ? { ...r, syncAttempted: true, syncFailed: true, syncMessage: failureMessage }
                : r
            )
          )
          continue
        }

        try {
          const torch = await invoiceApi.getInvoiceByInvoiceNumber(invoiceNo)
          const torchlight = torch as TorchlightInvoiceDetails
          setRows((prev) =>
            prev.map((r) => {
              if (r.source.invoice_no !== invoiceNo) return r
              const mismatch =
                roundOffAmount(r.source.source_amount) !==
                roundOffAmount(torchlight.amount)
              const updated: Row = {
                ...r,
                torchlight,
                mismatch,
                syncAttempted: true,
                syncFailed: false,
                syncMessage: '',
              }
              return { ...updated, selected: isRowPostable(updated) ? updated.selected || true : false }
            })
          )
          syncedCount += 1
        } catch (e) {
          setRows((prev) =>
            prev.map((r) =>
              r.source.invoice_no === invoiceNo
                ? {
                    ...r,
                    syncAttempted: true,
                    syncFailed: true,
                    syncMessage: 'Sync request completed, but invoice is still not available in Torchlight yet',
                  }
                : r
            )
          )
        }
      } finally {
        setSyncingInvoiceNos((prev) => ({ ...prev, [invoiceNo]: false }))
      }
    }

    if (syncedCount > 0) {
      toast.success(`Synced ${syncedCount} invoice(s).`)
    } else {
      toast.error('No missing invoices were synced.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[95vw]! w-[95vw]! max-h-[90vh] overflow-y-auto sm:max-w-[95vw]!'>
        <DialogHeader>
          <DialogTitle>Post Invoices</DialogTitle>
          <DialogDescription>
            Load invoices by container. <span className='font-medium'>Draft and Overdue</span> invoices in Torchlight
            can be selected and posted; already sent or paid invoices stay visible but disabled.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-12 gap-4 items-end'>
            <div className='md:col-span-7'>
              <Label htmlFor='container_no'>Container number</Label>
              <Input
                id='container_no'
                value={containerNo}
                onChange={(e) => setContainerNo(e.target.value)}
                placeholder='e.g. ABCD1234567'
                className='mt-2'
              />
            </div>
            <div className='md:col-span-5 flex gap-2 justify-end'>
              <Button
                variant='outline'
                type='button'
                onClick={loadInvoicesForContainer}
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Loading...
                  </>
                ) : (
                  'Load Invoices'
                )}
              </Button>
              <Button
                type='button'
                variant='default'
                onClick={handleSubmit}
                disabled={isSubmitting || rows.length === 0 || selectedCount === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Posting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </div>

          {rows.length > 0 && (
            <>
              {rows.length > 0 && postableRows.length === 0 && (
                <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100'>
                  <span className='font-medium'>No draft/overdue invoices to post.</span>{' '}
                  <span className='text-muted-foreground'>
                    All matching Torchlight invoices are already sent or not found. Nothing can be submitted.
                  </span>
                </div>
              )}

              {missingRows.length > 0 && (
                <div className='rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm'>
                  <div className='flex items-center justify-between gap-2'>
                    <div>
                      <span className='font-medium text-blue-700 dark:text-blue-300'>
                        {missingRows.length} invoice(s) are missing in Torchlight and will be created:
                      </span>
                      <span className='ml-2 text-muted-foreground'>
                        {missingRows.slice(0, 6).map((r) => r.source.invoice_no).join(', ')}
                        {missingRows.length > 6 ? ' ...' : ''}
                      </span>
                    </div>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() => void syncMissingInvoices()}
                      disabled={missingRows.length === 0 || isSubmitting}
                    >
                      Sync Missing Invoices
                    </Button>
                  </div>
                </div>
              )}

              {mismatchCount > 0 && (
                <div className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm'>
                  <span className='font-medium text-destructive'>
                    {mismatchCount} invoice(s) have amount differences.
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    Review rows marked <Badge variant='destructive' className='mx-1'>Mismatch</Badge> before posting.
                    {selectedMismatchCount > 0 && ` ${selectedMismatchCount} mismatched invoice(s) are currently selected.`}
                  </span>
                </div>
              )}

              <div className='rounded-md border'>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[60px]'>Post</TableHead>
                    <TableHead>Invoice number</TableHead>
                    <TableHead>Customer name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className='text-right'>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => toggleAll(Boolean(v))}
                        disabled={postableRows.length === 0}
                        aria-label='Select all draft invoices'
                      />
                    </TableCell>
                    <TableCell colSpan={5} className='text-sm text-muted-foreground'>
                      {selectedCount} draft/overdue invoice(s) selected
                      {postableRows.length < rows.length && (
                        <span className='ml-2'>
                          ({rows.length - postableRows.length} not postable — already sent or missing)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  {rows.map((row, idx) => {
                    const torchAmountFormatted = row.torchlight?.amount_formatted
                    const sourceAmount = formatSourceAmount(
                      roundOffAmount(row.source.source_amount)
                    )
                    const torchAmount = row.torchlight ? row.torchlight.amount : null

                    const postable = isRowPostable(row)

                    return (
                      <TableRow
                        key={row.source.invoice_no}
                        className={
                          row.mismatch && postable
                            ? 'bg-destructive/5'
                            : !postable
                              ? 'opacity-80'
                              : undefined
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={row.selected}
                            disabled={!postable}
                            onCheckedChange={(v) => toggleRow(idx, Boolean(v))}
                            aria-label={
                              postable
                                ? `Select invoice ${row.source.invoice_no}`
                                : `Invoice ${row.source.invoice_no} cannot be posted`
                            }
                          />
                        </TableCell>
                        <TableCell className='font-mono font-medium'>
                          {row.source.invoice_no}
                          {!row.torchlight && (
                            <Badge variant='outline' className='ml-2'>Will be created</Badge>
                          )}
                          {row.mismatch && (
                            <Badge variant='destructive' className='ml-2'>
                              Mismatch
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{row.torchlight?.customer?.name || row.source.customer_name}</TableCell>
                        <TableCell>
                          {row.torchlight?.subject || row.source.description || '-'}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex items-end justify-end gap-2'>
                            <div className='text-sm'>
                              <div className='text-muted-foreground'>Source: {sourceAmount}</div>
                              <div>
                                Torchlight:{' '}
                                {torchAmountFormatted || (torchAmount !== null ? torchAmount : '-')}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {!row.torchlight ? (
                            <div className='space-y-1'>
                              <Badge variant='secondary'>Not in Torchlight</Badge>
                              {row.syncAttempted && row.syncFailed && (
                                <div className='text-xs text-destructive'>{row.syncMessage || 'Sync failed'}</div>
                              )}
                              <Button
                                type='button'
                                size='sm'
                                variant='outline'
                                className='h-7 px-2 text-xs'
                                disabled={Boolean(syncingInvoiceNos[row.source.invoice_no]) || isSubmitting}
                                onClick={() => void retrySyncRow(row.source.invoice_no)}
                              >
                                {syncingInvoiceNos[row.source.invoice_no] ? (
                                  <>
                                    <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                                    Syncing...
                                  </>
                                ) : (
                                  'Retry Sync'
                                )}
                              </Button>
                            </div>
                          ) : postable ? (
                            <Badge variant='outline' className='bg-slate-100 dark:bg-slate-800'>
                              {row.torchlight.status_label ?? 'Draft'}
                            </Badge>
                          ) : (
                            <Badge variant='secondary'>
                              {row.torchlight.status_label ?? 'Posted'}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {rows.length === 0 && !isFetching && (
          <div className='text-sm text-muted-foreground pt-2'>
            Enter a container number and click <span className='font-medium'>Load Invoices</span>.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

