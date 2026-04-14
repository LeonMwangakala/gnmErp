import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'torchlight_access_token'
const USER_DATA = 'torchlight_user_data'

/** HR row linked to the login user (from employees + department + designation). */
export interface EmployeeContext {
  employee_record_id: number
  employee_number?: string | null
  department_id: number | null
  department_name: string | null
  designation_id: number | null
  designation_name: string | null
}

// Laravel User structure from API
export interface LaravelUser {
  id: number
  name: string
  email: string
  phone?: string
  avatar?: string
  type?: string
  created_by?: number
  employee_context?: EmployeeContext | null
  [key: string]: any // Allow additional fields
}

// Frontend AuthUser structure
interface AuthUser {
  id: number
  name: string
  email: string
  phone?: string
  avatar?: string
  type?: string
  role: string[]
  exp: number
  /** Present when this user is linked to an HR employee record */
  employee_context?: EmployeeContext | null
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    setUserFromLaravel: (laravelUser: LaravelUser) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
    isAuthenticated: () => boolean
  }
}

export const useAuthStore = create<AuthState>()((set, get) => {
  // Initialize from cookies
  const cookieToken = getCookie(ACCESS_TOKEN)
  const cookieUser = getCookie(USER_DATA)
  
  const initToken = cookieToken || ''
  const initUser = cookieUser ? JSON.parse(cookieUser) : null

  return {
    auth: {
      user: initUser,
      setUser: (user) => {
        if (user) {
          setCookie(USER_DATA, JSON.stringify(user))
        } else {
          removeCookie(USER_DATA)
        }
        set((state) => ({ ...state, auth: { ...state.auth, user } }))
      },
      setUserFromLaravel: (laravelUser: LaravelUser) => {
        // Convert Laravel user to frontend AuthUser format
        const authUser: AuthUser = {
          id: laravelUser.id,
          name: laravelUser.name,
          email: laravelUser.email,
          phone: laravelUser.phone,
          avatar: laravelUser.avatar,
          type: laravelUser.type,
          role: laravelUser.type === 'admin' || laravelUser.type === 'owner' 
            ? ['admin'] 
            : ['user'],
          exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
          employee_context:
            laravelUser.employee_context !== undefined
              ? laravelUser.employee_context
              : undefined,
        }
        get().auth.setUser(authUser)
      },
      accessToken: initToken,
      setAccessToken: (accessToken: string) => {
        if (accessToken) {
          setCookie(ACCESS_TOKEN, accessToken)
        } else {
          removeCookie(ACCESS_TOKEN)
        }
        set((state) => ({ ...state, auth: { ...state.auth, accessToken } }))
      },
      resetAccessToken: () => {
        removeCookie(ACCESS_TOKEN)
        set((state) => ({ ...state, auth: { ...state.auth, accessToken: '' } }))
      },
      reset: () => {
        removeCookie(ACCESS_TOKEN)
        removeCookie(USER_DATA)
        set((state) => ({
          ...state,
          auth: { ...state.auth, user: null, accessToken: '' },
        }))
      },
      isAuthenticated: () => {
        const state = get()
        return !!(state.auth.accessToken && state.auth.user)
      },
    },
  }
})
