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
  clearRefreshToken,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  storeRefreshToken,
  tryRefresh,
} from '@/lib/api'

export interface User {
  id: string
  email: string
  name: string
  createdAt?: string
  onboardingCompleted?: boolean
  age?: number | null
  gender?: string | null
  heightCm?: number | null
  activityLevel?: string | null
  fitnessGoal?: string | null
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

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const refresh = getRefreshToken()
      if (refresh) {
        const ok = await tryRefresh()
        if (ok) {
          try {
            const { user: me } = await api.get<{ user: User }>('/auth/me')
            setUser(me)
            setToken(getAccessToken())
            setLoading(false)
            return
          } catch {
            // fall through to cleared state
          }
        }
        clearRefreshToken()
        setAccessToken(null)
      }
      setLoading(false)
    }
    void init()
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
        setAccessToken(res.accessToken)
        storeRefreshToken(res.refreshToken)
        setToken(res.accessToken)
      },
      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore
        }
        setUser(null)
        setAccessToken(null)
        clearRefreshToken()
        setToken(null)
      },
      completeOnboarding: async (data) => {
        const res = await api.post<OnboardingResult>('/auth/onboarding', data)
        setUser(res.user)
        return res
      },
      updateProfile: async (data) => {
        const res = await api.put<{ user: User }>('/auth/profile', data)
        setUser(res.user)
        return res.user
      },
      deleteAccount: async (password) => {
        await api.delete<{ message: string }>('/auth/account', { password })
        setUser(null)
        setAccessToken(null)
        clearRefreshToken()
        setToken(null)
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