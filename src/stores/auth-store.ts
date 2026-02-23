import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'torchlight_access_token'
const USER_DATA = 'torchlight_user_data'

// Laravel User structure from API
export interface LaravelUser {
  id: number
  name: string
  email: string
  phone?: string
  avatar?: string
  type?: string
  created_by?: number
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
