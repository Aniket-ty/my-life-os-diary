import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  api,
  ApiError,
  clearAllTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  storeRefreshToken,
  tryRefresh,
} from '@/lib/api'

export interface User {
  id: string
  email: string
  phoneNumber?: string | null
  name: string
  createdAt?: string
  onboardingCompleted?: boolean
  age?: number | null
  gender?: string | null
  heightCm?: number | null
  activityLevel?: string | null
  fitnessGoal?: string | null
  defaultCurrency?: string
}

export interface OnboardingResult {
  user: User
  scan: unknown
  calculations: {
    bmr: number
    tdee: number
    calorieGoal: number
    proteinG: number
    carbsG: number
    fatG: number
    leanBodyMass?: number | null
  }
}

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  completeOnboarding: (data: Record<string, unknown>) => Promise<OnboardingResult>
  updateProfile: (data: Record<string, unknown>) => Promise<User>
  deleteAccount: (password: string) => Promise<void>
}

const USER_KEY = 'lifeos_user'

function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function storeCachedUser(user: User | null) {
  if (typeof window === 'undefined') return
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_KEY)
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCachedUser())
  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const [loading, setLoading] = useState<boolean>(() => {
    // If we already have a cached user and access token, we are immediately authenticated
    if (getAccessToken() && getCachedUser()) return false
    // If we only have a refresh token, we need to do an initial background check
    if (getRefreshToken()) return true
    return false
  })

  useEffect(() => {
    let isMounted = true

    async function init() {
      const refreshToken = getRefreshToken()
      const existingToken = getAccessToken()

      if (!refreshToken && !existingToken) {
        if (isMounted) setLoading(false)
        return
      }

      // Try validating existing access token first if present
      if (existingToken) {
        try {
          const { user: me } = await api.get<{ user: User }>('/auth/me')
          if (isMounted) {
            setUser(me)
            storeCachedUser(me)
            setToken(existingToken)
            setLoading(false)
          }
          return
        } catch (err) {
          // If not an unauthorized error (e.g. server waking up), keep cached session alive
          if (err instanceof ApiError && err.status !== 401 && err.status !== 403) {
            if (isMounted) setLoading(false)
            return
          }
        }
      }

      // If no valid access token, try refreshing
      if (refreshToken) {
        const ok = await tryRefresh()
        if (ok) {
          try {
            const { user: me } = await api.get<{ user: User }>('/auth/me')
            if (isMounted) {
              setUser(me)
              storeCachedUser(me)
              setToken(getAccessToken())
              setLoading(false)
            }
            return
          } catch {
            // Keep existing state if offline/waking up
          }
        }
      }

      // If refresh failed definitively and there is no valid access token
      if (!getRefreshToken() && !getAccessToken()) {
        if (isMounted) {
          setUser(null)
          storeCachedUser(null)
          setToken(null)
        }
      }

      if (isMounted) setLoading(false)
    }

    void init()

    return () => {
      isMounted = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login: async (email, password) => {
        const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
          '/auth/login',
          { email, password },
        )
        setUser(res.user)
        storeCachedUser(res.user)
        setAccessToken(res.accessToken)
        storeRefreshToken(res.refreshToken)
        setToken(res.accessToken)
      },
      register: async (name, email, password) => {
        const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
          '/auth/register',
          { email, password, name },
        )
        setUser(res.user)
        storeCachedUser(res.user)
        setAccessToken(res.accessToken)
        storeRefreshToken(res.refreshToken)
        setToken(res.accessToken)
      },
      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore network failure on logout
        }
        setUser(null)
        setToken(null)
        clearAllTokens()
      },
      completeOnboarding: async (data) => {
        const res = await api.post<OnboardingResult>('/auth/onboarding', data)
        setUser(res.user)
        storeCachedUser(res.user)
        return res
      },
      updateProfile: async (data) => {
        const res = await api.put<{ user: User }>('/auth/profile', data)
        setUser(res.user)
        storeCachedUser(res.user)
        return res.user
      },
      deleteAccount: async (password) => {
        await api.delete<{ message: string }>('/auth/account', { password })
        setUser(null)
        setToken(null)
        clearAllTokens()
      },
    }),
    [user, token, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }