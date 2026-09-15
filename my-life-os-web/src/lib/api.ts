const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://my-life-os-diary.onrender.com/api/v1'

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
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
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
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

const REFRESH_KEY = 'lifeos_refresh_token'

export function storeRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_KEY)
}

export async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      setAccessToken(null)
      clearRefreshToken()
      return false
    }
    const data = (await res.json()) as { accessToken: string; refreshToken: string }
    setAccessToken(data.accessToken)
    storeRefreshToken(data.refreshToken)
    return true
  } catch {
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