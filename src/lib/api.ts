import axios, { AxiosInstance, AxiosError } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { mapShipperFromApi, type Shipper } from '@/features/customs/shippers-storage'
import { mapVesselFromApi, type Vessel } from '@/features/customs/vessels-storage'

// Get API base URL from environment variable or use default
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://torchlight.africa/api'

/** CMTS / GNM billing API (consignments, containers, invoice lookups) */
export const CMTS_BILLING_API_BASE =
  import.meta.env.VITE_CMTS_BILLING_API_URL || 'https://api.gnmcargo.com/api/v1'

// Create axios instance with default config
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000, // 30 seconds
})

// Create separate axios instance for external APIs (without auth token)
const externalApi: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000, // 30 seconds
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().auth.accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized - reset auth (redirect is handled by queryCache.onError in main.tsx)
    if (error.response?.status === 401) {
      useAuthStore.getState().auth.reset()
      // Don't show toast here, let queryCache.onError handle it
      return Promise.reject(error)
    }

    // Handle other errors
    if (error.response) {
      const data = error.response.data as { message?: string; status?: number }
      const message = data?.message || 'An error occurred'
      toast.error(message)
    } else if (error.request) {
      toast.error('Network error. Please check your connection.')
    } else {
      toast.error('An unexpected error occurred.')
    }

    return Promise.reject(error)
  }
)

// API endpoints
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/login', { email, password })
    return response.data
  },
  logout: async () => {
    const response = await api.post('/logout')
    return response.data
  },
  getProfile: async () => {
    const response = await api.get('/getProfile')
    return response.data
  },
  updateProfile: async (data: { name: string; email: string; phone: string; avatar?: File }) => {
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('email', data.email)
    formData.append('phone', data.phone)
    if (data.avatar) {
      formData.append('avatar', data.avatar)
    }
    const response = await api.post('/updateProfile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

export const companyApi = {
  getCompanies: async () => {
    const response = await api.get('/getCompanies')
    return response.data.data || []
  },
  switchCompany: async (companyKey: string) => {
    const response = await api.post(`/switch-company/${companyKey}`)
    
    // Update auth store with new token and user
    if (response.data.status === 200 && response.data.token) {
      useAuthStore.getState().auth.setAccessToken(response.data.token)
      if (response.data.users) {
        useAuthStore.getState().auth.setUserFromLaravel(response.data.users)
      }
    }
    
    return response.data
  },
}

export interface PaginationParams {
  page?: number
  per_page?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  [key: string]: any
}

export interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
  from: number | null
  to: number | null
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface StaffUserOption {
  id: number
  name: string
  email: string
}

export const userApi = {
  /** Company owner + staff for invoice payment report "created by" filter */
  getStaffUsersForReports: async (): Promise<StaffUserOption[]> => {
    const response = await api.get('/users/staff-for-reports')
    if (response.data?.status === 403) {
      return []
    }
    return response.data.data || []
  },
  /** Employees in a Finance department (linked users), for payment cashier reassignment */
  getFinanceStaffUsersForCashier: async (): Promise<StaffUserOption[]> => {
    const response = await api.get('/users/finance-staff-for-cashier')
    if (response.data?.status === 403) {
      return []
    }
    return response.data.data || []
  },
}

export type CreateCustomerPayload = {
  name: string
  contact: string
  email: string
  short_name: string
  customer_number?: string
  tax_number?: string
  vrn?: string
  billing_name?: string
  billing_phone?: string
  billing_address?: string
  billing_city?: string
  billing_state?: string
  billing_country?: string
  billing_zip?: string
  shipping_name?: string
  shipping_phone?: string
  shipping_address?: string
  shipping_city?: string
  shipping_state?: string
  shipping_country?: string
  shipping_zip?: string
}

export type CreateCustomerResponseData = {
  id: number
  customer_id?: number
  customer_number?: string
  name?: string
  email?: string
  contact?: string
  short_name?: string
}

export const customerApi = {
  getCustomers: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/customers', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getCustomer: async (id: number) => {
    const response = await api.get(`/customers/${id}`)
    return response.data.data
  },
  getCustomerInvoices: async (customerId: number, params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const response = await api.get(`/customers/${customerId}/invoices`, { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  searchCustomers: async (search: string, limit: number = 20): Promise<any[]> => {
    const response = await api.get('/customers/search', {
      params: { search, limit },
    })
    return response.data.data || []
  },

  /**
   * Creates a customer (same handler as legacy POST /customer/create).
   * Backend may return HTTP 200 with JSON status 422/403 for validation or permission errors.
   */
  createCustomer: async (
    payload: CreateCustomerPayload
  ): Promise<
    | { ok: true; data: CreateCustomerResponseData }
    | { ok: false; message: string; errors?: unknown }
  > => {
    const response = await api.post('/customers', payload)
    const body = response.data as {
      status?: number
      message?: string
      data?: CreateCustomerResponseData | Record<string, unknown>
    }
    if (body?.status === 200 && body.data && typeof body.data === 'object' && 'id' in body.data) {
      return { ok: true, data: body.data as CreateCustomerResponseData }
    }
    return {
      ok: false,
      message: body?.message || 'Failed to create customer',
      errors: body?.data,
    }
  },
}

export const invoiceApi = {
  getInvoicesReport: async (params: {
    date_from: string
    date_to: string
    status: string
    customer_id?: string
  }): Promise<
    | { ok: true; data: InvoiceReportData }
    | { ok: false; message: string }
  > => {
    const response = await api.get('/invoices/report/summary', {
      params: {
        date_from: params.date_from,
        date_to: params.date_to,
        status: params.status,
        ...(params.customer_id ? { customer_id: params.customer_id } : {}),
      },
    })
    const body = response.data as { status?: number; message?: string; data?: InvoiceReportData }
    if (body?.status === 200 && body.data) {
      return { ok: true, data: body.data }
    }
    return { ok: false, message: body?.message || 'Failed to load report' }
  },

  getPostedContainersReport: async (params: {
    date_from: string
    date_to: string
    container_no?: string
  }): Promise<
    | { ok: true; data: PostedContainersReportData }
    | { ok: false; message: string }
  > => {
    const response = await api.get('/invoices/report/posted-containers', {
      params: {
        date_from: params.date_from,
        date_to: params.date_to,
        ...(params.container_no?.trim() ? { container_no: params.container_no.trim() } : {}),
      },
    })
    const body = response.data as { status?: number; message?: string; data?: unknown }
    if (body?.status === 200 && body.data) {
      return { ok: true, data: normalizePostedContainersReportData(body.data) }
    }
    return { ok: false, message: body?.message || 'Failed to load report' }
  },

  getInvoices: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/invoices', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getInvoice: async (id: number) => {
    const response = await api.get(`/invoices/${id}`)
    return response.data.data
  },
  getInvoicePayments: async (invoiceId: number) => {
    const response = await api.get(`/invoices/${invoiceId}/payments`)
    return {
      data: response.data.data || [],
      total_paid: response.data.total_paid || 0,
      total_paid_formatted: response.data.total_paid_formatted || '0.00',
    }
  },
  getInvoiceCreditNotes: async (invoiceId: number) => {
    const response = await api.get(`/invoices/${invoiceId}/credit-notes`)
    return {
      data: response.data.data || [],
      total_credit_note: response.data.total_credit_note || 0,
      total_credit_note_formatted: response.data.total_credit_note_formatted || '0.00',
    }
  },
  getInvoiceContainerDetails: async (invoiceNo: string) => {
    const response = await externalApi.get(`${CMTS_BILLING_API_BASE}/invoice-container-details`, {
      params: { invoice_no: invoiceNo },
    })
    return response.data
  },
  /** Consignments + goods linked to bill / invoice number (CMTS) */
  getInvoiceConsignmentsGoods: async (invoiceNo: string) => {
    const response = await externalApi.post(`${CMTS_BILLING_API_BASE}/invoice-consignments-goods`, {
      invoice_no: invoiceNo.trim(),
    })
    return response.data
  },
  bulkPost: async (
    invoiceIds?: number[],
    options?: {
      container_no?: string
      invoice_containers?: Array<{ invoice_id: number; container_no: string }>
    }
  ) => {
    const payload: Record<string, unknown> =
      invoiceIds && invoiceIds.length > 0 ? { invoice_ids: invoiceIds } : {}
    if (options?.container_no !== undefined && options.container_no.trim() !== '') {
      payload.container_no = options.container_no.trim()
    }
    if (options?.invoice_containers?.length) {
      payload.invoice_containers = options.invoice_containers
    }
    const response = await api.post('/invoices/bulk-post', payload)
    return response.data
  },
  syncSourceAmount: async (invoiceNumber: string, sourceAmount: number) => {
    const response = await api.post('/invoices/sync-source-amount', {
      invoice_number: invoiceNumber,
      source_amount: sourceAmount,
    })
    return response.data
  },
  getInvoiceByInvoiceNumber: async (invoiceNo: string) => {
    const response = await api.get('/invoices/by-invoice-number', {
      params: { invoice_no: invoiceNo },
    })
    return response.data.data
  },
  getInvoiceNosByContainer: async (containerNo: string) => {
    const response = await externalApi.get(`${CMTS_BILLING_API_BASE}/invoice-nos-by-container`, {
      params: { container_no: containerNo },
    })
    return response.data
  },
  syncInvoiceToERPByInvoiceNumber: async (invoiceNo: string, force: boolean = false) => {
    const response = await externalApi.post(`${CMTS_BILLING_API_BASE}/sync-invoice-to-erp`, {
      invoice_no: invoiceNo.trim(),
      force,
    })
    return response.data
  },
  syncDiscountToCmts: async (invoiceId: number, amount: number, details?: string) => {
    const response = await api.post(`/invoices/${invoiceId}/sync-discount-cmts`, {
      amount,
      details: details?.trim() || undefined,
    })
    return response.data
  },
  updateInvoiceAmount: async (invoiceId: number, amount: number, details?: string) => {
    const response = await api.post(`/invoices/${invoiceId}/update-amount`, {
      amount,
      details: details?.trim() || undefined,
    })
    return response.data
  },
}

export interface InvoicePaymentReportRow {
  id: number
  customer_name: string
  invoice_number: string
  invoice_total: number
  invoice_total_formatted: string
  invoice_status: string
  amount: number
  amount_formatted: string
  currency_code: string
  currency_display_symbol: string
  account_paid_at: string
  account_label: string
  date: string
  date_raw: string | null
  account_id: number
  cashier_name: string
}

export interface InvoicePaymentReportAccountSummary {
  account_id: number
  account_label: string
  currency_code: string
  currency_display_symbol: string
  total: number
  total_formatted: string
  payment_count: number
}

export interface InvoicePaymentReportCurrencyTotal {
  currency_code: string
  currency_display_symbol: string
  total: number
  total_formatted: string
  payment_count: number
}

export interface InvoicePaymentReportData {
  rows: InvoicePaymentReportRow[]
  summary_by_account: InvoicePaymentReportAccountSummary[]
  totals_by_currency: InvoicePaymentReportCurrencyTotal[]
  date_from: string
  date_to: string
}

export interface InvoiceReportRow {
  id: number
  invoice_number: string
  customer_name: string
  issue_date: string
  issue_date_raw: string | null
  due_date: string
  status: number
  status_label: string
  total: number
  total_formatted: string
  due: number
  due_formatted: string
}

export interface InvoiceReportSummary {
  invoice_count: number
  total_amount: number
  total_amount_formatted: string
  total_due: number
  total_due_formatted: string
}

export interface InvoiceReportData {
  date_from: string
  date_to: string
  status_filter: string
  rows: InvoiceReportRow[]
  summary: InvoiceReportSummary
}

export interface PostedContainersReportRow {
  id: number
  container_no: string
  invoice_number: string
  customer_name: string
  posted_at: string
  posted_at_raw: string | null
  posted_by_name: string
}

export interface PostedContainersReportData {
  date_from: string
  date_to: string
  container_no_filter: string
  rows: PostedContainersReportRow[]
  summary: { row_count: number }
}

export interface CompanyCurrencyRow {
  currencyId: number
  currencyNumber: string
  currencyCode: string
  currencyName: string
  currencySymbol: string
  exchangeRate: number | null
  base: boolean
  position: string
  decimalNumber: number
  decimalSeparator: string
  thousandSeparator: string
  updatedAt: string | null
}

export type VesselVoyage = {
  id: number
  status: 'ACTIVE' | 'INACTIVE'
  vesselId: number | null
  vesselName: string
  voyage: string
  arrivalDate: string
  berthingDate: string
  carryingDate: string
  documentDeadline: string
  paymentCutOff: string
  manifestReadyTraDate: string
  manifestReadyInvoiceDate: string
  portOperator: string
  createdAt: string
}

function mapVesselVoyageFromApi(row: Record<string, unknown>): VesselVoyage {
  return {
    id: Number(row.id) || 0,
    status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    vesselId:
      row.vesselId === null || row.vesselId === undefined || row.vesselId === ''
        ? null
        : Number(row.vesselId) || null,
    vesselName: String(row.vesselName ?? ''),
    voyage: String(row.voyage ?? ''),
    arrivalDate: String(row.arrivalDate ?? ''),
    berthingDate: String(row.berthingDate ?? ''),
    carryingDate: String(row.carryingDate ?? ''),
    documentDeadline: String(row.documentDeadline ?? ''),
    paymentCutOff: String(row.paymentCutOff ?? ''),
    manifestReadyTraDate: String(row.manifestReadyTraDate ?? ''),
    manifestReadyInvoiceDate: String(row.manifestReadyInvoiceDate ?? ''),
    portOperator: String(row.portOperator ?? ''),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
  }
}

function normalizePostedContainersReportData(data: unknown): PostedContainersReportData {
  const src = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const rawRows = Array.isArray(src.rows) ? src.rows : []
  const rows: PostedContainersReportRow[] = rawRows.map((item, index) => {
    const r = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const idNum = Number(r.id)
    return {
      id: Number.isFinite(idNum) && idNum > 0 ? idNum : index + 1,
      container_no: String(r.container_no ?? r.containerNo ?? '').trim(),
      invoice_number: String(r.invoice_number ?? r.invoice_no ?? r.invoiceNumber ?? '').trim(),
      customer_name: String(r.customer_name ?? r.customer ?? '').trim(),
      posted_at: String(r.posted_at ?? r.postedAt ?? '').trim(),
      posted_at_raw:
        r.posted_at_raw == null ? null : String(r.posted_at_raw ?? r.postedAtRaw ?? '').trim(),
      posted_by_name: String(r.posted_by_name ?? r.posted_by ?? r.postedBy ?? '').trim(),
    }
  })
  const rowCount = Number((src.summary as { row_count?: unknown } | undefined)?.row_count)
  return {
    date_from: String(src.date_from ?? ''),
    date_to: String(src.date_to ?? ''),
    container_no_filter: String(src.container_no_filter ?? src.container_no ?? ''),
    rows,
    summary: { row_count: Number.isFinite(rowCount) ? rowCount : rows.length },
  }
}

export const paymentApi = {
  getInvoicePaymentsReport: async (params: {
    date_from: string
    date_to: string
    user_id?: string
  }): Promise<
    | { ok: true; data: InvoicePaymentReportData }
    | { ok: false; message: string }
  > => {
    const response = await api.get('/payments/report/invoice-payments', {
      params: {
        date_from: params.date_from,
        date_to: params.date_to,
        ...(params.user_id ? { user_id: params.user_id } : {}),
      },
    })
    const body = response.data as { status?: number; message?: string; data?: InvoicePaymentReportData }
    if (body?.status === 200 && body.data) {
      return { ok: true, data: body.data }
    }
    return { ok: false, message: body?.message || 'Failed to load report' }
  },

  getPayments: async (params?: PaginationParams & { invoice_id?: number }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/payments', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },

  exportInvoicePaymentsByDate: async (date: string): Promise<Blob> => {
    const response = await api.get('/payments/export-by-date', {
      params: { date },
      responseType: 'blob',
    })
    return response.data
  },
  fixInvoicePayments: async (invoiceNumber: string): Promise<any> => {
    const response = await api.post('/payments/fix-invoice-payments', {
      invoice_number: invoiceNumber,
    })
    return response.data
  },
  updateInvoicePaymentCreatedBy: async (payload: {
    to_created_by: number
    from_created_by?: number
    invoice_number?: string
    payment_ids?: number[]
  }): Promise<any> => {
    const response = await api.post('/payments/update-created-by', payload)
    return response.data
  },
  syncPaymentToCmts: async (id: number): Promise<any> => {
    const response = await api.post(`/payments/${id}/sync-cmts`)
    return response.data
  },

  getPaymentFormData: async () => {
    const response = await api.get('/payment/form-data')
    return response.data.data || { currencies: [], accounts: [], invoices: [] }
  },

  createPayment: async (data: Record<string, any>) => {
    const response = await api.post('/invoice-payments', data)
    return response.data
  },
  deletePayment: async (id: number): Promise<any> => {
    const response = await api.delete(`/invoice-payments/${id}`)
    return response.data
  },
  searchInvoices: async (
    search: string,
    limit: number = 20,
    usage?: 'payment' | 'invoice_payment' | 'credit_note'
  ): Promise<any[]> => {
    const response = await api.get('/payments/search-invoices', {
      params: { search, limit, usage },
    })
    return response.data.data || []
  },
}

function mapCompanyCurrencyRow(row: Record<string, unknown>): CompanyCurrencyRow {
  return {
    currencyId: Number(row.currencyId) || 0,
    currencyNumber: String(row.currencyNumber ?? ''),
    currencyCode: String(row.currencyCode ?? ''),
    currencyName: String(row.currencyName ?? ''),
    currencySymbol: String(row.currencySymbol ?? ''),
    exchangeRate:
      row.exchangeRate === null || row.exchangeRate === undefined || row.exchangeRate === ''
        ? null
        : Number(row.exchangeRate),
    base: Boolean(row.base),
    position: String(row.position ?? ''),
    decimalNumber: Number(row.decimalNumber) || 0,
    decimalSeparator: String(row.decimalSeparator ?? ''),
    thousandSeparator: String(row.thousandSeparator ?? ''),
    updatedAt: row.updatedAt ? String(row.updatedAt) : null,
  }
}

export const companyCurrencyApi = {
  list: async (): Promise<CompanyCurrencyRow[]> => {
    const response = await api.get('/company-currencies')
    const raw = (response.data?.data || []) as Record<string, unknown>[]
    return raw.map((row) => mapCompanyCurrencyRow(row))
  },
  updateExchangeRate: async (
    currencyId: number,
    exchangeRate: number
  ): Promise<CompanyCurrencyRow> => {
    const response = await api.put(`/company-currencies/${currencyId}/exchange-rate`, {
      exchangeRate,
    })
    return mapCompanyCurrencyRow((response.data?.data || {}) as Record<string, unknown>)
  },
}

export const creditNoteApi = {
  getCreditNotes: async (params?: PaginationParams & { invoice_id?: number }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/credit-notes', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getCreditNoteFormData: async (): Promise<any> => {
    const response = await api.get('/credit-note/form-data')
    return response.data.data || { currencies: [] }
  },
  createCreditNote: async (data: FormData): Promise<any> => {
    const response = await api.post('/credit-notes', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  searchInvoices: async (
    params: { search: string; limit?: number; usage?: 'credit_note' | 'payment' | 'invoice_payment' }
  ): Promise<any> => {
    const response = await api.get('/payments/search-invoices', { params })
    return response.data
  },
}

export const bankAccountApi = {
  getBankAccounts: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/bank-accounts', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getBankAccount: async (id: number): Promise<any> => {
    const response = await api.get(`/bank-accounts/${id}`)
    return response.data.data
  },
  getFormData: async (): Promise<any> => {
    const response = await api.get('/bank-accounts/form-data')
    return response.data.data || { currencies: [] }
  },
  createBankAccount: async (data: {
    holder_name: string
    bank_name: string
    account_number: string
    opening_balance: number
    contact_number: string
    bank_address?: string
    currency: number
  }): Promise<any> => {
    const response = await api.post('/bank-accounts', data)
    return response.data
  },
  updateBankAccount: async (
    id: number,
    data: {
      holder_name: string
      bank_name: string
      account_number: string
      opening_balance: number
      contact_number: string
      bank_address?: string
      currency: number
    }
  ): Promise<any> => {
    const response = await api.put(`/bank-accounts/${id}`, data)
    return response.data
  },
  deleteBankAccount: async (id: number): Promise<any> => {
    const response = await api.delete(`/bank-accounts/${id}`)
    return response.data
  },
}

export const bankTransferApi = {
  getBankTransfers: async (params?: PaginationParams & {
    date?: string
    from_account?: number
    to_account?: number
  }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/bank-transfers', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getBankAccounts: async (): Promise<any[]> => {
    try {
      const response = await api.get('/bank-transfers/accounts')
      return response.data.data || []
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error)
      return []
    }
  },
  getBankTransfer: async (id: number): Promise<any> => {
    const response = await api.get(`/bank-transfers/${id}`)
    return response.data.data
  },
  createBankTransfer: async (data: {
    from_account: number
    to_account: number
    amount: number
    date: string
    reference?: string
    description?: string
  }): Promise<any> => {
    const response = await api.post('/bank-transfers', data)
    return response.data
  },
  updateBankTransfer: async (
    id: number,
    data: {
      from_account: number
      to_account: number
      amount: number
      date: string
      reference?: string
      description?: string
    }
  ): Promise<any> => {
    const response = await api.put(`/bank-transfers/${id}`, data)
    return response.data
  },
  deleteBankTransfer: async (id: number): Promise<any> => {
    const response = await api.delete(`/bank-transfers/${id}`)
    return response.data
  },
}

export const revenueApi = {
  getRevenues: async (params?: PaginationParams & {
    date?: string
    customer?: number
    account?: number
    category?: number
  }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/revenues', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getFormData: async (): Promise<any> => {
    const response = await api.get('/revenues/form-data')
    return response.data.data || { accounts: [], categories: [], currencies: [] }
  },
  getRevenue: async (id: number): Promise<any> => {
    const response = await api.get(`/revenues/${id}`)
    return response.data.data
  },
  createRevenue: async (data: FormData): Promise<any> => {
    const response = await api.post('/revenues', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  updateRevenue: async (id: number, data: FormData): Promise<any> => {
    const response = await api.put(`/revenues/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  deleteRevenue: async (id: number): Promise<any> => {
    const response = await api.delete(`/revenues/${id}`)
    return response.data
  },
}

export const billApi = {
  getBills: async (params?: PaginationParams & {
    status?: number | string
    vender_id?: number
    bill_date?: string
  }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/bills', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getFormData: async (): Promise<any> => {
    const response = await api.get('/bills/form-data')
    return response.data.data || { vendors: [], categories: [], products: [], bill_number: '' }
  },
  getBill: async (id: number): Promise<any> => {
    const response = await api.get(`/bills/${id}`)
    return response.data.data
  },
  createBill: async (data: any): Promise<any> => {
    const response = await api.post('/bills', data)
    return response.data
  },
  exportBills: async (): Promise<any> => {
    const response = await api.get('/bills/export')
    return response.data
  },
}

export const expensePaymentApi = {
  getExpensePayments: async (params?: PaginationParams & {
    vender_id?: number
    account_id?: number
    category_id?: number
    date?: string
  }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/expense-payments', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getFormData: async (): Promise<any> => {
    const response = await api.get('/expense-payments/form-data')
    return response.data.data || { vendors: [], categories: [], accounts: [] }
  },
  getExpensePayment: async (id: number): Promise<any> => {
    const response = await api.get(`/expense-payments/${id}`)
    return response.data.data
  },
  createExpensePayment: async (data: FormData): Promise<any> => {
    const response = await api.post('/expense-payments', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  updateExpensePayment: async (id: number, data: FormData): Promise<any> => {
    const response = await api.put(`/expense-payments/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  deleteExpensePayment: async (id: number): Promise<any> => {
    const response = await api.delete(`/expense-payments/${id}`)
    return response.data
  },
}

export const debitNoteApi = {
  getDebitNotes: async (params?: PaginationParams & {
    bill_id?: number
    vendor_id?: number
    date?: string
  }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/debit-notes', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getFormData: async (): Promise<any> => {
    const response = await api.get('/debit-notes/form-data')
    return response.data.data || { bills: [] }
  },
  createDebitNote: async (data: any): Promise<any> => {
    const response = await api.post('/debit-notes', data)
    return response.data
  },
  deleteDebitNote: async (id: number): Promise<any> => {
    const response = await api.delete(`/debit-notes/${id}`)
    return response.data
  },
}

export const pettyCashRequestApi = {
  getPettyCashRequests: async (params?: PaginationParams & {
    status?: string
  }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/petty-cash-requests', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getFormData: async (): Promise<any> => {
    const response = await api.get('/petty-cash-requests/form-data')
    return response.data.data || { bank_accounts: [], currencies: [] }
  },
  getPettyCashRequest: async (id: number): Promise<any> => {
    const response = await api.get(`/petty-cash-requests/${id}`)
    return response.data.data
  },
  createPettyCashRequest: async (data: any): Promise<any> => {
    const response = await api.post('/petty-cash-requests', data)
    return response.data
  },
  updatePettyCashRequest: async (id: number, data: any): Promise<any> => {
    const response = await api.post('/petty-cash-requests', { ...data, hidden_id: id })
    return response.data
  },
  approvePettyCashRequest: async (id: number, data: any): Promise<any> => {
    const response = await api.post(`/petty-cash-requests/${id}/approve`, data)
    return response.data
  },
  deletePettyCashRequest: async (id: number): Promise<any> => {
    const response = await api.delete(`/petty-cash-requests/${id}`)
    return response.data
  },
}

export const pettyCashApi = {
  getPettyCashExpenses: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/petty-cash', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getFormData: async (): Promise<any> => {
    const response = await api.get('/petty-cash/form-data')
    return response.data.data || { balance: 0, currencies: [], categories: [], petty_number: '' }
  },
  getReceiverNames: async (receiver_for: string): Promise<any> => {
    const response = await api.get('/petty-cash/receiver-names', { params: { receiver_for } })
    return response.data.data || []
  },
  getReceiverDetails: async (receiver: number, receiver_for: string): Promise<any> => {
    const response = await api.get('/petty-cash/receiver-details', { params: { receiver, receiver_for } })
    return response.data.data
  },
  getPettyCash: async (id: number): Promise<any> => {
    const response = await api.get(`/petty-cash/${id}`)
    return response.data.data
  },
  createPettyCash: async (data: any): Promise<any> => {
    const response = await api.post('/petty-cash', data)
    return response.data
  },
  updatePettyCash: async (id: number, data: any): Promise<any> => {
    const response = await api.post('/petty-cash', { ...data, hidden_id: id })
    return response.data
  },
  deletePettyCash: async (id: number): Promise<any> => {
    const response = await api.delete(`/petty-cash/${id}`)
    return response.data
  },
}

export const vendorApi = {
  getVendors: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/vendors', { params })
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 15,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },
  getVendor: async (id: number): Promise<any> => {
    const response = await api.get(`/vendors/${id}`)
    return response.data.data
  },
  createVendor: async (data: any): Promise<any> => {
    const response = await api.post('/vendors', data)
    return response.data
  },
  updateVendor: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/vendors/${id}`, data)
    return response.data
  },
  deleteVendor: async (id: number): Promise<any> => {
    const response = await api.delete(`/vendors/${id}`)
    return response.data
  },
  exportVendors: async (): Promise<any> => {
    const response = await api.get('/vendors/export', { responseType: 'blob' })
    return response.data
  },
}

export type CustomsJobFormOptions = {
  shipment_types: string[]
  cargo_types: string[]
  type_of_cargo: string[]
}

export type SaveShipperPayload = {
  name: string
  address1?: string
  address2?: string
  address3?: string
  city?: string
  country?: string
  email?: string
  contactName?: string
  designation?: string
  telNo?: string
  extNo?: string
  faxNo?: string
  contactEmail?: string
  mobile?: string
  ieCode?: string
}

export const customsShipperApi = {
  list: async (params?: {
    search?: string
    per_page?: number
    page?: number
  }): Promise<{
    data: Shipper[]
    pagination: PaginationMeta
  }> => {
    const response = await api.get('/customs/shippers', { params })
    const raw = (response.data?.data || []) as Record<string, unknown>[]
    return {
      data: raw.map((row) => mapShipperFromApi(row)),
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 50,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },

  get: async (id: number): Promise<Shipper> => {
    const response = await api.get(`/customs/shippers/${id}`)
    return mapShipperFromApi((response.data?.data || {}) as Record<string, unknown>)
  },

  create: async (payload: SaveShipperPayload): Promise<Shipper> => {
    const response = await api.post('/customs/shippers', payload)
    return mapShipperFromApi((response.data?.data || {}) as Record<string, unknown>)
  },

  update: async (id: number, payload: SaveShipperPayload): Promise<Shipper> => {
    const response = await api.put(`/customs/shippers/${id}`, payload)
    return mapShipperFromApi((response.data?.data || {}) as Record<string, unknown>)
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/customs/shippers/${id}`)
  },

  syncVesselShipperLinks: async (
    vessels: Array<{ external_id: string; shipper_ids: number[] }>
  ): Promise<void> => {
    await api.post('/customs/vessel-shipper-links/sync', { vessels })
  },
}

export type CreateVesselPayload = {
  vesselName: string
  imo?: string | null
  mmsi?: string | null
  built?: number | null
  grossTonnage?: number | null
  deadweight?: number | null
  size?: string | null
  image?: File | null
}

export const customsVesselApi = {
  list: async (params?: {
    search?: string
    per_page?: number
    page?: number
  }): Promise<{
    data: Vessel[]
    pagination: PaginationMeta
  }> => {
    const response = await api.get('/customs/vessels', { params })
    const raw = (response.data?.data || []) as Record<string, unknown>[]
    return {
      data: raw.map((row) => mapVesselFromApi(row)),
      pagination: response.data.pagination || {
        current_page: 1,
        per_page: 100,
        total: 0,
        last_page: 1,
        from: null,
        to: null,
      },
    }
  },

  create: async (payload: CreateVesselPayload): Promise<Vessel> => {
    const imageFile = payload.image instanceof File ? payload.image : null
    if (imageFile) {
      const fd = new FormData()
      fd.append('vesselName', payload.vesselName)
      if (payload.imo) fd.append('imo', payload.imo)
      if (payload.mmsi) fd.append('mmsi', payload.mmsi)
      if (payload.built != null && Number.isFinite(payload.built)) {
        fd.append('built', String(payload.built))
      }
      if (payload.grossTonnage != null && Number.isFinite(payload.grossTonnage)) {
        fd.append('grossTonnage', String(payload.grossTonnage))
      }
      if (payload.deadweight != null && Number.isFinite(payload.deadweight)) {
        fd.append('deadweight', String(payload.deadweight))
      }
      if (payload.size) fd.append('size', payload.size)
      fd.append('image', imageFile)
      const response = await api.post('/customs/vessels', fd, {
        transformRequest: [
          (data, headers) => {
            if (data instanceof FormData) {
              delete headers['Content-Type']
            }
            return data
          },
        ],
      })
      return mapVesselFromApi((response.data?.data || {}) as Record<string, unknown>)
    }

    const body: Record<string, unknown> = { vesselName: payload.vesselName }
    if (payload.imo) body.imo = payload.imo
    if (payload.mmsi) body.mmsi = payload.mmsi
    if (payload.built != null && Number.isFinite(payload.built)) body.built = payload.built
    if (payload.grossTonnage != null && Number.isFinite(payload.grossTonnage)) {
      body.grossTonnage = payload.grossTonnage
    }
    if (payload.deadweight != null && Number.isFinite(payload.deadweight)) {
      body.deadweight = payload.deadweight
    }
    if (payload.size) body.size = payload.size

    const response = await api.post('/customs/vessels', body)
    return mapVesselFromApi((response.data?.data || {}) as Record<string, unknown>)
  },

  update: async (id: number, payload: CreateVesselPayload): Promise<Vessel> => {
    const imageFile = payload.image instanceof File ? payload.image : null
    if (imageFile) {
      const fd = new FormData()
      fd.append('vesselName', payload.vesselName)
      if (payload.imo) fd.append('imo', payload.imo)
      if (payload.mmsi) fd.append('mmsi', payload.mmsi)
      if (payload.built != null && Number.isFinite(payload.built)) {
        fd.append('built', String(payload.built))
      }
      if (payload.grossTonnage != null && Number.isFinite(payload.grossTonnage)) {
        fd.append('grossTonnage', String(payload.grossTonnage))
      }
      if (payload.deadweight != null && Number.isFinite(payload.deadweight)) {
        fd.append('deadweight', String(payload.deadweight))
      }
      if (payload.size) fd.append('size', payload.size)
      fd.append('image', imageFile)
      const response = await api.put(`/customs/vessels/${id}`, fd, {
        transformRequest: [
          (data, headers) => {
            if (data instanceof FormData) {
              delete headers['Content-Type']
            }
            return data
          },
        ],
      })
      return mapVesselFromApi((response.data?.data || {}) as Record<string, unknown>)
    }

    const body: Record<string, unknown> = { vesselName: payload.vesselName }
    if (payload.imo) body.imo = payload.imo
    if (payload.mmsi) body.mmsi = payload.mmsi
    if (payload.built != null && Number.isFinite(payload.built)) body.built = payload.built
    if (payload.grossTonnage != null && Number.isFinite(payload.grossTonnage)) {
      body.grossTonnage = payload.grossTonnage
    }
    if (payload.deadweight != null && Number.isFinite(payload.deadweight)) {
      body.deadweight = payload.deadweight
    }
    if (payload.size) body.size = payload.size

    const response = await api.put(`/customs/vessels/${id}`, body)
    return mapVesselFromApi((response.data?.data || {}) as Record<string, unknown>)
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/customs/vessels/${id}`)
  },
}

export const customsJobApi = {
  listJobs: async (params?: {
    search?: string
    per_page?: number
    page?: number
  }): Promise<{
    data: any[]
    pagination: {
      current_page: number
      last_page: number
      per_page: number
      total: number
    }
  }> => {
    const response = await api.get('/customs/jobs', { params })
    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || {
        current_page: 1,
        last_page: 1,
        per_page: params?.per_page || 50,
        total: Array.isArray(response.data?.data) ? response.data.data.length : 0,
      },
    }
  },
  getJob: async (id: number): Promise<any> => {
    const response = await api.get(`/customs/jobs/${id}`)
    return response.data?.data || null
  },
  getFormOptions: async (): Promise<CustomsJobFormOptions> => {
    const response = await api.get('/customs/jobs/form-options')
    return (
      response.data?.data || {
        shipment_types: ['SEA', 'AIR', 'ROAD', 'POST_ENTRY'],
        cargo_types: ['FCL', 'LCL'],
        type_of_cargo: ['NORMAL', 'DANGEROUS', 'FRAGILE', 'ABNORMAL', 'PERISHABLE'],
      }
    )
  },
  searchFileManagers: async (search: string, limit: number = 20): Promise<any[]> => {
    const response = await api.get('/customs/jobs/file-managers', {
      params: { search, limit },
    })
    return response.data?.data || []
  },
  createJob: async (payload: {
    customer_id?: number | null
    customer_name: string
    shipment_type: string
    shipper_id?: number | null
    mbl_no?: string | null
    hbl_no?: string | null
    invoice_no?: string | null
    date_of_receipt?: string | null
    status?: string | null
    meta?: Record<string, unknown> | null
  }): Promise<any> => {
    const response = await api.post('/customs/jobs', payload)
    return response.data
  },
  updateJob: async (
    id: number,
    payload: {
      customer_id?: number | null
      customer_name: string
      shipment_type: string
      shipper_id?: number | null
      mbl_no?: string | null
      hbl_no?: string | null
      invoice_no?: string | null
      date_of_receipt?: string | null
      status?: string | null
      meta?: Record<string, unknown> | null
    }
  ): Promise<any> => {
    const response = await api.put(`/customs/jobs/${id}`, payload)
    return response.data
  },
  deleteJob: async (id: number): Promise<any> => {
    const response = await api.delete(`/customs/jobs/${id}`)
    return response.data
  },
  uploadJobDocument: async (
    jobId: number,
    payload: { document_name?: string; file: File }
  ): Promise<any> => {
    const formData = new FormData()
    if (payload.document_name) {
      formData.append('document_name', payload.document_name)
    }
    formData.append('file', payload.file)

    const response = await api.post(`/customs/jobs/${jobId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  getJobDocuments: async (
    jobId: number,
    params?: { per_page?: number; page?: number }
  ): Promise<any> => {
    const response = await api.get(`/customs/jobs/${jobId}/documents`, { params })
    return response.data
  },
  deleteJobDocument: async (jobId: number, documentId: number): Promise<any> => {
    const response = await api.delete(`/customs/jobs/${jobId}/documents/${documentId}`)
    return response.data
  },
}

export const customsVesselVoyageApi = {
  list: async (params?: { search?: string }): Promise<VesselVoyage[]> => {
    const response = await api.get('/customs/vessel-voyages', { params })
    const raw = (response.data?.data || []) as Record<string, unknown>[]
    return raw.map((row) => mapVesselVoyageFromApi(row))
  },
  create: async (payload: {
    vesselId: number
    voyage: string
    arrivalDate?: string | null
    berthingDate?: string | null
    carryingDate?: string | null
    documentDeadline?: string | null
    paymentCutOff?: string | null
    manifestReadyTraDate?: string | null
    manifestReadyInvoiceDate?: string | null
    portOperator?: string | null
    status?: 'ACTIVE' | 'INACTIVE'
  }): Promise<VesselVoyage> => {
    const response = await api.post('/customs/vessel-voyages', payload)
    return mapVesselVoyageFromApi((response.data?.data || {}) as Record<string, unknown>)
  },
  update: async (
    id: number,
    payload: {
      vesselId: number
      voyage: string
      arrivalDate?: string | null
      berthingDate?: string | null
      carryingDate?: string | null
      documentDeadline?: string | null
      paymentCutOff?: string | null
      manifestReadyTraDate?: string | null
      manifestReadyInvoiceDate?: string | null
      portOperator?: string | null
      status?: 'ACTIVE' | 'INACTIVE'
    }
  ): Promise<VesselVoyage> => {
    const response = await api.put(`/customs/vessel-voyages/${id}`, payload)
    return mapVesselVoyageFromApi((response.data?.data || {}) as Record<string, unknown>)
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/customs/vessel-voyages/${id}`)
  },
}

