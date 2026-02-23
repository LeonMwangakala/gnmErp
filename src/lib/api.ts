import axios, { AxiosInstance, AxiosError } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

// Get API base URL from environment variable or use default
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://torchlight.africa/api'

// Create axios instance with default config
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
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
}
