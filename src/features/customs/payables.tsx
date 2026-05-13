import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AsyncSelect from 'react-select/async'
import axios from 'axios'
import {
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Wallet,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { CustomsPage } from './customs-page'
import {
  customsJobApi,
  customsPayableApi,
  vendorApi,
  type CustomsPayableCategory,
  type CustomsPayableRecord,
  type CustomsPayableStatus,
} from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const STATUS_LABEL: Record<CustomsPayableStatus, string> = {
  draft: 'Draft',
  pending_manager: 'Pending manager',
  manager_rejected: 'Rejected (manager)',
  pending_chief: 'Pending chief accountant',
  chief_rejected: 'Rejected (chief)',
  ready_for_payment: 'Ready for payment',
  paid: 'Paid',
}

const CATEGORY_LABEL: Record<CustomsPayableCategory, string> = {
  shipping_line: 'Shipping Line',
  declaration: 'Declaration (TRA)',
  port: 'Port',
  tbs: 'TBS',
}

function statusBadgeVariant(
  s: CustomsPayableStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'paid') return 'default'
  if (s === 'manager_rejected' || s === 'chief_rejected') return 'destructive'
  if (s === 'ready_for_payment') return 'secondary'
  return 'outline'
}

type JobOption = { id: number; job_no: string }

type VendorSelectOption = {
  value: string
  label: string
  id: number
  name: string
}

/** Match jobs-create / file manager async select styling */
const vendorAsyncSelectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: '36px',
    height: '36px',
    borderColor: state.isFocused ? 'hsl(var(--ring))' : '#E2E8F1',
    backgroundColor: 'transparent',
    borderRadius: 'calc(var(--radius) - 2px)',
    borderWidth: '1px',
    boxShadow: state.isFocused
      ? '0 0 0 3px hsl(var(--ring) / 0.5)'
      : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '&:hover': {
      borderColor: state.isFocused ? 'hsl(var(--ring))' : '#E2E8F1',
    },
  }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.875rem',
  }),
  input: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
    fontSize: '0.875rem',
    margin: 0,
    padding: 0,
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--foreground))',
    fontSize: '0.875rem',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 'calc(var(--radius) - 2px)',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    zIndex: 50,
  }),
  menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 100 }),
  menuList: (base: Record<string, unknown>) => ({
    ...base,
    padding: '0.25rem',
  }),
  option: (
    base: Record<string, unknown>,
    state: { isFocused: boolean; isSelected: boolean }
  ) => ({
    ...base,
    backgroundColor: state.isFocused || state.isSelected ? '#f3f4f6' : '#ffffff',
    color: '#111827',
    fontSize: '0.875rem',
    padding: '0.375rem 0.5rem',
    borderRadius: 'calc(var(--radius) - 4px)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#e5e7eb',
    },
    '&:hover': {
      backgroundColor: '#f3f4f6',
    },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    padding: '0 8px',
    '&:hover': {
      color: 'hsl(var(--foreground))',
    },
  }),
  clearIndicator: (base: Record<string, unknown>) => ({
    ...base,
    color: 'hsl(var(--muted-foreground))',
    padding: '0 8px',
    '&:hover': {
      color: 'hsl(var(--foreground))',
    },
  }),
}

type PayableForm = {
  customs_job_id: string
  payable_category: CustomsPayableCategory | ''
  invoice_number: string
  description: string
  amount: string
  currency: string
  bill_due_date: string
  customs_job_document_id: string
  vender_id: string
  category_id: string
  product_service_id: string
}

const emptyForm: PayableForm = {
  customs_job_id: '',
  payable_category: '',
  invoice_number: '',
  description: '',
  amount: '',
  currency: 'USD',
  bill_due_date: '',
  customs_job_document_id: '',
  vender_id: '',
  category_id: '',
  product_service_id: '',
}

export function CustomsPayables() {
  const [rows, setRows] = useState<CustomsPayableRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 25
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const [jobs, setJobs] = useState<JobOption[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PayableForm>(emptyForm)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [docOptions, setDocOptions] = useState<{ id: number; name: string }[]>([])
  const [selectedVendor, setSelectedVendor] = useState<VendorSelectOption | null>(null)
  const [expenseCatOptions, setExpenseCatOptions] = useState<{ id: number; name: string }[]>([])
  const [productOptions, setProductOptions] = useState<{ id: number; name: string }[]>([])
  const [categoryChoices, setCategoryChoices] = useState<
    { value: CustomsPayableCategory; label: string }[]
  >([])

  /** Bumps when category/product lists refresh so Radix Select remounts with new options */
  const [accountingOptionsNonce, setAccountingOptionsNonce] = useState(0)
  const formOptionsAbortRef = useRef<AbortController | null>(null)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectRole, setRejectRole] = useState<'manager' | 'chief'>('manager')
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<CustomsPayableRecord | null>(null)
  const [bankOptions, setBankOptions] = useState<{ id: number; name: string }[]>([])
  const [payForm, setPayForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    account_id: '',
    payee_name: '',
    reference: '',
    description: '',
  })
  const [paySubmitting, setPaySubmitting] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await customsPayableApi.list({
        per_page: perPage,
        page,
        ...(statusFilter ? { status: statusFilter } : {}),
      })
      setRows(res.data)
      setLastPage(res.pagination.last_page || 1)
      setTotal(res.pagination.total || 0)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    let cancelled = false
    const mapRow = (j: Record<string, unknown>): JobOption => ({
      id: Number(j.id),
      job_no: String(j.job_no || j.jobNo || ''),
    })

    ;(async () => {
      const perPage = 200 // API max: CustomsController validates per_page <= 200
      try {
        const first = await customsJobApi.listJobs({ per_page: perPage, page: 1 })
        if (cancelled) return
        let combined = (first.data || []).map(mapRow)
        const lastPage = first.pagination?.last_page ?? 1
        for (let p = 2; p <= lastPage; p++) {
          const r = await customsJobApi.listJobs({ per_page: perPage, page: p })
          if (cancelled) return
          combined = combined.concat((r.data || []).map(mapRow))
        }
        setJobs(combined.filter((o) => o.id && o.job_no))
      } catch {
        if (!cancelled) setJobs([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        (r.job_no || '').toLowerCase().includes(q) ||
        String(r.id).includes(q) ||
        (r.invoice_number || '').toLowerCase().includes(q)
    )
  }, [rows, search])

  const loadPayableFormOptions = useCallback(async (jobId?: number) => {
    formOptionsAbortRef.current?.abort()
    const ac = new AbortController()
    formOptionsAbortRef.current = ac
    setOptionsLoading(true)
    try {
      const o = await customsPayableApi.getFormOptions(jobId, ac.signal)
      if (ac.signal.aborted) return
      setCategoryChoices(o.payable_categories || [])
      setDocOptions(o.documents || [])
      setExpenseCatOptions(o.categories || [])
      setProductOptions(o.products || [])
      setBankOptions(o.bank_accounts || [])
      setAccountingOptionsNonce((n) => n + 1)
    } catch (e: unknown) {
      if (ac.signal.aborted) return
      if (axios.isCancel(e)) return
      setDocOptions([])
      setExpenseCatOptions([])
      setProductOptions([])
      setBankOptions([])
    } finally {
      if (!ac.signal.aborted) {
        setOptionsLoading(false)
      }
    }
  }, [])

  const loadVendorOptions = async (inputValue: string): Promise<VendorSelectOption[]> => {
    try {
      const res = await vendorApi.getVendors({
        search: inputValue.trim(),
        per_page: 50,
        page: 1,
      })
      const rows = res.data || []
      return rows
        .map((v: Record<string, unknown>) => {
          const id = Number(v.id)
          if (!Number.isFinite(id) || id <= 0) return null
          const name = String(v.name ?? '')
          const num = v.vendor_number != null ? String(v.vendor_number) : ''
          const label = [name, num].filter(Boolean).join(' — ') || `Vendor #${id}`
          return { value: String(id), label, id, name } as VendorSelectOption
        })
        .filter(Boolean) as VendorSelectOption[]
    } catch {
      return []
    }
  }

  const openCreate = () => {
    setFormMode('create')
    setEditingId(null)
    setForm(emptyForm)
    setSelectedVendor(null)
    setFormOpen(true)
  }

  const openEdit = async (row: CustomsPayableRecord) => {
    if (row.status !== 'draft') {
      toast.error('Only draft payables can be edited.')
      return
    }
    setFormMode('edit')
    setEditingId(row.id)
    setForm({
      customs_job_id: String(row.customs_job_id),
      payable_category: row.payable_category,
      invoice_number: row.invoice_number || '',
      description: row.description || '',
      amount: String(row.amount),
      currency: row.currency === 'TZS' ? 'TZS' : 'USD',
      bill_due_date: row.bill_due_date || '',
      customs_job_document_id: row.customs_job_document_id
        ? String(row.customs_job_document_id)
        : '',
      vender_id: row.vender_id ? String(row.vender_id) : '',
      category_id: row.category_id ? String(row.category_id) : '',
      product_service_id: row.product_service_id ? String(row.product_service_id) : '',
    })
    setFormOpen(true)
    await loadPayableFormOptions(row.customs_job_id)
    if (row.vender_id) {
      try {
        const v = await vendorApi.getVendor(row.vender_id)
        if (v && Number(v.id) > 0) {
          const id = Number(v.id)
          const name = String(v.name ?? '')
          setSelectedVendor({
            value: String(id),
            label: name || `Vendor #${id}`,
            id,
            name,
          })
        } else {
          setSelectedVendor(null)
        }
      } catch {
        setSelectedVendor({
          value: String(row.vender_id),
          label: `Vendor #${row.vender_id}`,
          id: row.vender_id,
          name: '',
        })
      }
    } else {
      setSelectedVendor(null)
    }
  }

  useEffect(() => {
    if (!formOpen || formMode !== 'create') return
    const jid = Number(form.customs_job_id)
    const jobId = Number.isFinite(jid) && jid > 0 ? jid : undefined
    void loadPayableFormOptions(jobId)
  }, [form.customs_job_id, formOpen, formMode, loadPayableFormOptions])

  /** After adding categories/products in another tab, refetch when user returns to this tab */
  useEffect(() => {
    if (!formOpen) return
    let t: ReturnType<typeof setTimeout> | undefined
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(t)
      t = setTimeout(() => {
        const jid = Number(form.customs_job_id)
        const jobId = Number.isFinite(jid) && jid > 0 ? jid : undefined
        void loadPayableFormOptions(jobId)
      }, 400)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      clearTimeout(t)
    }
  }, [formOpen, form.customs_job_id, loadPayableFormOptions])

  useEffect(() => {
    return () => {
      formOptionsAbortRef.current?.abort()
    }
  }, [])

  const saveDraft = async () => {
    const jobId = Number(form.customs_job_id)
    if (!jobId) {
      toast.error('Select a job.')
      return
    }
    if (!form.payable_category) {
      toast.error('Select a payable category.')
      return
    }
    const amt = Number(form.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount.')
      return
    }

    const payload = {
      customs_job_id: jobId,
      payable_category: form.payable_category as CustomsPayableCategory,
      invoice_number: form.invoice_number || null,
      description: form.description || null,
      amount: amt,
      currency: form.currency || 'USD',
      bill_due_date: form.bill_due_date || null,
      customs_job_document_id: form.customs_job_document_id
        ? Number(form.customs_job_document_id)
        : null,
      vender_id: form.vender_id ? Number(form.vender_id) : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      product_service_id: form.product_service_id ? Number(form.product_service_id) : null,
    }

    setFormSubmitting(true)
    try {
      if (formMode === 'create') {
        const res = await customsPayableApi.create(payload)
        if (res.status === 200) {
          toast.success(res.message || 'Draft saved.')
          setFormOpen(false)
          void loadList()
        } else {
          toast.error(res.message || 'Could not save.')
        }
      } else if (editingId) {
        const res = await customsPayableApi.update(editingId, payload)
        if (res.status === 200) {
          toast.success(res.message || 'Updated.')
          setFormOpen(false)
          void loadList()
        } else {
          toast.error(res.message || 'Could not update.')
        }
      }
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as any).response?.data?.message : null
      toast.error(msg || 'Request failed.')
    } finally {
      setFormSubmitting(false)
    }
  }

  const doSubmit = async (id: number) => {
    try {
      const res = await customsPayableApi.submit(id)
      if (res.status === 200) {
        toast.success(res.message || 'Submitted.')
        void loadList()
      } else {
        toast.error(res.message || 'Submit failed.')
      }
    } catch {
      /* interceptor */
    }
  }

  const doApproveManager = async (id: number) => {
    try {
      const res = await customsPayableApi.approveManager(id)
      if (res.status === 200) {
        toast.success(res.message || 'Approved; bill created.')
        void loadList()
      } else {
        toast.error(res.message || 'Approval failed.')
      }
    } catch {
      /* */
    }
  }

  const doApproveChief = async (id: number) => {
    try {
      const res = await customsPayableApi.approveChief(id)
      if (res.status === 200) {
        toast.success(res.message || 'Approved for payment.')
        void loadList()
      } else {
        toast.error(res.message || 'Approval failed.')
      }
    } catch {
      /* */
    }
  }

  const openReject = (id: number, role: 'manager' | 'chief') => {
    setRejectTargetId(id)
    setRejectRole(role)
    setRejectReason('')
    setRejectOpen(true)
  }

  const confirmReject = async () => {
    if (!rejectTargetId || !rejectReason.trim()) {
      toast.error('Enter a reason.')
      return
    }
    setRejectSubmitting(true)
    try {
      const res =
        rejectRole === 'manager'
          ? await customsPayableApi.rejectManager(rejectTargetId, rejectReason.trim())
          : await customsPayableApi.rejectChief(rejectTargetId, rejectReason.trim())
      if (res.status === 200) {
        toast.success(res.message || 'Rejected.')
        setRejectOpen(false)
        void loadList()
      } else {
        toast.error(res.message || 'Rejection failed.')
      }
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as any).response?.data?.message : null
      toast.error(msg || 'Rejection failed.')
    } finally {
      setRejectSubmitting(false)
    }
  }

  const openPayment = async (row: CustomsPayableRecord) => {
    setPaymentTarget(row)
    setPayForm({
      date: new Date().toISOString().slice(0, 10),
      account_id: '',
      payee_name: '',
      reference: `Customs payable #${row.id}`,
      description: row.description || '',
    })
    setPaymentOpen(true)
    await loadPayableFormOptions(row.customs_job_id)
  }

  const confirmPayment = async () => {
    if (!paymentTarget) return
    const acc = Number(payForm.account_id)
    if (!acc) {
      toast.error('Select a bank account.')
      return
    }
    if (!payForm.payee_name.trim()) {
      toast.error('Enter payee / receiver name.')
      return
    }
    setPaySubmitting(true)
    try {
      const res = await customsPayableApi.recordPayment(paymentTarget.id, {
        date: payForm.date,
        account_id: acc,
        payee_name: payForm.payee_name.trim(),
        reference: payForm.reference || null,
        description: payForm.description || null,
      })
      if (res.status === 200) {
        toast.success(res.message || 'Payment recorded.')
        setPaymentOpen(false)
        void loadList()
      } else {
        toast.error(res.message || 'Payment failed.')
      }
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as any).response?.data?.message : null
      toast.error(msg || 'Payment failed.')
    } finally {
      setPaySubmitting(false)
    }
  }

  return (
    <CustomsPage
      title='Payables'
      description='Job invoices (shipping line, declaration, port, TBS): submit for approval, bill creation, and accountant payment.'
      headerActions={
        <Button type='button' onClick={openCreate}>
          <Plus className='mr-2 h-4 w-4' />
          New payable
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle>Customs payables</CardTitle>
              <CardDescription>
                Draft → customs manager (creates bill) → chief accountant → accountant pays from bank.
              </CardDescription>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='relative'>
                <Search className='text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4' />
                <Input
                  className='w-[200px] pl-8'
                  placeholder='Job / invoice…'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter || 'all'}
                onValueChange={(v) => {
                  setPage(1)
                  setStatusFilter(v === 'all' ? '' : v)
                }}
              >
                <SelectTrigger className='w-[200px]'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All statuses</SelectItem>
                  {(Object.keys(STATUS_LABEL) as CustomsPayableStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {loading ? (
            <div className='text-muted-foreground flex items-center gap-2 py-8'>
              <Loader2 className='h-5 w-5 animate-spin' />
              Loading…
            </div>
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className='text-muted-foreground py-10 text-center'>
                        No payables found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className='font-medium'>{r.id}</TableCell>
                        <TableCell>{r.job_no || r.customs_job_id}</TableCell>
                        <TableCell>{CATEGORY_LABEL[r.payable_category]}</TableCell>
                        <TableCell>{r.invoice_number || '—'}</TableCell>
                        <TableCell>
                          {r.amount} {r.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(r.status)}>{STATUS_LABEL[r.status]}</Badge>
                        </TableCell>
                        <TableCell className='max-w-[180px] truncate text-sm'>
                          {r.document_label || '—'}
                        </TableCell>
                        <TableCell className='text-right'>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='sm' className='h-8 gap-1'>
                                Actions
                                <ChevronDown className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-52'>
                              <DropdownMenuLabel>Payable #{r.id}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {r.status === 'draft' ? (
                                <>
                                  <DropdownMenuItem onClick={() => void openEdit(r)}>
                                    <Pencil className='mr-2 h-4 w-4' />
                                    Edit draft
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void doSubmit(r.id)}>
                                    <Send className='mr-2 h-4 w-4' />
                                    Submit for approval
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                              {r.status === 'pending_manager' ? (
                                <>
                                  <DropdownMenuItem onClick={() => void doApproveManager(r.id)}>
                                    <Check className='mr-2 h-4 w-4' />
                                    Approve (create bill)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openReject(r.id, 'manager')}
                                    className='text-destructive'
                                  >
                                    <XCircle className='mr-2 h-4 w-4' />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                              {r.status === 'pending_chief' ? (
                                <>
                                  <DropdownMenuItem onClick={() => void doApproveChief(r.id)}>
                                    <Check className='mr-2 h-4 w-4' />
                                    Chief approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openReject(r.id, 'chief')}
                                    className='text-destructive'
                                  >
                                    <XCircle className='mr-2 h-4 w-4' />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                              {r.status === 'ready_for_payment' ? (
                                <DropdownMenuItem onClick={() => void openPayment(r)}>
                                  <Wallet className='mr-2 h-4 w-4' />
                                  Record payment
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {total > 0 ? (
            <div className='text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm'>
              <span>
                Page {page} of {lastPage} ({total} total)
              </span>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={page >= lastPage || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setSelectedVendor(null)
        }}
      >
        <DialogContent className='max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-4xl'>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'New payable' : 'Edit payable'}</DialogTitle>
            <DialogDescription>
              Link to a job document, then add vendor and accounting lines before submitting. Drafts can be
              edited freely.
            </DialogDescription>
          </DialogHeader>
          <div className='grid grid-cols-1 gap-4 py-2 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Job *</Label>
              <Select
                value={form.customs_job_id}
                disabled={formMode === 'edit'}
                onValueChange={(v) => setForm((f) => ({ ...f, customs_job_id: v }))}
              >
                <SelectTrigger className='w-full min-w-0'>
                  <SelectValue placeholder='Select job' />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.job_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>Payable category *</Label>
              <Select
                value={form.payable_category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, payable_category: v as CustomsPayableCategory }))
                }
              >
                <SelectTrigger className='w-full min-w-0'>
                  <SelectValue placeholder='Category' />
                </SelectTrigger>
                <SelectContent>
                  {(categoryChoices.length
                    ? categoryChoices
                    : (Object.keys(CATEGORY_LABEL) as CustomsPayableCategory[]).map((value) => ({
                        value,
                        label: CATEGORY_LABEL[value],
                      }))
                  ).map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {optionsLoading ? (
              <div className='text-muted-foreground col-span-full flex items-center gap-2 text-sm'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Loading job options…
              </div>
            ) : null}
            <div className='space-y-2'>
              <Label>Invoice number</Label>
              <Input
                value={form.invoice_number}
                onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <Label>Bill due date</Label>
              <Input
                type='date'
                value={form.bill_due_date}
                onChange={(e) => setForm((f) => ({ ...f, bill_due_date: e.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <Label>Amount *</Label>
              <Input
                type='number'
                step='0.01'
                min='0'
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className='space-y-2'>
              <Label>Currency</Label>
              <Select
                value={form.currency === 'TZS' ? 'TZS' : 'USD'}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger className='w-full min-w-0'>
                  <SelectValue placeholder='Currency' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='USD'>USD</SelectItem>
                  <SelectItem value='TZS'>TZS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>Job document (required to submit)</Label>
              <Select
                value={form.customs_job_document_id || 'none'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, customs_job_document_id: v === 'none' ? '' : v }))
                }
              >
                <SelectTrigger className='w-full min-w-0'>
                  <SelectValue placeholder='Select document' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>None</SelectItem>
                  {docOptions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>Vendor (required to submit)</Label>
              <AsyncSelect<VendorSelectOption, false>
                instanceId='payables-vendor-async'
                value={selectedVendor}
                loadOptions={loadVendorOptions}
                defaultOptions
                cacheOptions
                onChange={(option) => {
                  const selected = option ?? null
                  setSelectedVendor(selected)
                  setForm((f) => ({ ...f, vender_id: selected ? String(selected.id) : '' }))
                }}
                placeholder='Search vendor name or number…'
                isClearable
                noOptionsMessage={() => 'No vendors found'}
                loadingMessage={() => 'Searching vendors…'}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition='fixed'
                className='react-select-container'
                classNamePrefix='react-select'
                styles={vendorAsyncSelectStyles}
              />
            </div>
            <div key={`payable-expense-cat-${accountingOptionsNonce}`} className='space-y-2'>
              <Label>Expense category (required to submit)</Label>
              <Select
                value={form.category_id || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger className='w-full min-w-0'>
                  <SelectValue placeholder='Category' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>None</SelectItem>
                  {expenseCatOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div key={`payable-product-${accountingOptionsNonce}`} className='space-y-2'>
              <Label>Product / service (required to submit)</Label>
              <Select
                value={form.product_service_id || 'none'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, product_service_id: v === 'none' ? '' : v }))
                }
              >
                <SelectTrigger className='w-full min-w-0'>
                  <SelectValue placeholder='Product' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>None</SelectItem>
                  {productOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label>Description</Label>
              <Textarea
                className='min-h-[80px] w-full resize-y'
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type='button' disabled={formSubmitting} onClick={() => void saveDraft()}>
              {formSubmitting ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Save draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reject payable ({rejectRole === 'manager' ? 'Customs manager' : 'Chief accountant'})
            </DialogTitle>
            <DialogDescription>Provide a reason. The submitter can correct and resubmit if needed.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder='Reason…'
            rows={4}
          />
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={rejectSubmitting}
              onClick={() => void confirmReject()}
            >
              {rejectSubmitting ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Select the bank account used, record the payee, and post the expense. The linked bill will be
              marked paid.
            </DialogDescription>
          </DialogHeader>
          {paymentTarget ? (
            <div className='space-y-3 text-sm'>
              <p>
                <span className='text-muted-foreground'>Amount: </span>
                <strong>
                  {paymentTarget.amount} {paymentTarget.currency}
                </strong>{' '}
                · Job {paymentTarget.job_no || paymentTarget.customs_job_id}
              </p>
              <div className='space-y-2'>
                <Label>Payment date *</Label>
                <Input
                  type='date'
                  value={payForm.date}
                  onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className='space-y-2'>
                <Label>Bank account *</Label>
                <Select
                  value={payForm.account_id || 'none'}
                  onValueChange={(v) =>
                    setPayForm((p) => ({ ...p, account_id: v === 'none' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select account' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Select…</SelectItem>
                    {bankOptions.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Payee / receiver *</Label>
                <Input
                  value={payForm.payee_name}
                  onChange={(e) => setPayForm((p) => ({ ...p, payee_name: e.target.value }))}
                  placeholder='Name on payment'
                />
              </div>
              <div className='space-y-2'>
                <Label>Reference</Label>
                <Input
                  value={payForm.reference}
                  onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
                />
              </div>
              <div className='space-y-2'>
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={payForm.description}
                  onChange={(e) => setPayForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type='button' disabled={paySubmitting} onClick={() => void confirmPayment()}>
              {paySubmitting ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Save payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomsPage>
  )
}
