const RAW_API_BASE = import.meta.env.VITE_API_BASE ?? 'https://my-life-os-diary.onrender.com/api/v1'
const API_BASE = RAW_API_BASE.replace(/\/+$/, '')

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const ACCESS_KEY = 'lifeos_access_token'
const REFRESH_KEY = 'lifeos_refresh_token'

let accessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null

export function setAccessToken(token: string | null) {
  accessToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(ACCESS_KEY, token)
    } else {
      localStorage.removeItem(ACCESS_KEY)
    }
  }
}

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem(ACCESS_KEY)
  }
  return accessToken
}

export function storeRefreshToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_KEY, token)
  }
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(REFRESH_KEY)
  }
  return null
}

export function clearRefreshToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFRESH_KEY)
  }
}

export function clearAllTokens() {
  setAccessToken(null)
  clearRefreshToken()
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lifeos_user')
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const currentToken = getAccessToken()
  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`)
  }

  const controller = new AbortController()
  // 45 second timeout to allow Render free tier instances to spin up from sleep
  const timer = setTimeout(() => controller.abort(), 45000)
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('The server took too long to respond. It may be waking up — try again in a moment.', 408)
    }
    throw err
  }
  clearTimeout(timer)

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request<T>(path, options, false)
    }
    throw new ApiError('Session expired. Please sign in again.', 401)
  }

  const contentType = res.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json')
    ? await res.json()
    : await res.text()

  if (!res.ok) {
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const errBody = body as { error: string | Array<{ message?: string }> }
      const message = Array.isArray(errBody.error)
        ? errBody.error.map((e) => e.message).filter(Boolean).join(', ')
        : errBody.error
      throw new ApiError(message || 'Request failed', res.status)
    }
    throw new ApiError('Request failed', res.status)
  }

  return body as T
}

export async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      // ONLY clear tokens when server explicitly states the refresh token is invalid or expired
      if (res.status === 401 || res.status === 403) {
        clearAllTokens()
      }
      return false
    }

    const data = (await res.json()) as { accessToken: string; refreshToken: string }
    setAccessToken(data.accessToken)
    storeRefreshToken(data.refreshToken)
    return true
  } catch {
    clearTimeout(timer)
    // On network failure or timeout during server wake-up, do NOT clear tokens
    return false
  }
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) => {
    const qs = params ? toQuery(params) : ''
    return request<T>(qs ? `${path}?${qs}` : path)
  },
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
}

function toQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v))
    }
  }
  return sp.toString()
}

export { ApiError, API_BASE }