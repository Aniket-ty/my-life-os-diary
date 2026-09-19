import { api, API_BASE } from '@/lib/api'

export interface OfflineDiaryEntry {
  localId: string
  title?: string | null
  content: string
  mood?: string | null
  weather?: string | null
  entryDate?: string
  isPinned?: boolean
  createdAt: string
}

export interface OfflineTodo {
  localId: string
  title: string
  description?: string | null
  category?: string | null
  priority?: 'low' | 'medium' | 'high'
  isCompleted?: boolean
  dueDate?: string | null
  createdAt: string
}

export interface OfflineWorkout {
  localId: string
  name: string
  durationMin?: number | null
  totalCaloriesBurned?: number | null
  workoutDate?: string
  notes?: string | null
  exercises?: Array<{
    name: string
    sets: number
    reps: string
    weightKg?: number | null
  }>
  createdAt: string
}

export interface OfflineExpense {
  localId: string
  amount: number
  currency?: string
  description: string
  category?: string
  date?: string
  paymentMethod?: string
  createdAt: string
}

export interface SyncPayload {
  diaryEntries: OfflineDiaryEntry[]
  todos: OfflineTodo[]
  workouts: OfflineWorkout[]
  expenses: OfflineExpense[]
}

export interface SyncResponse {
  success: boolean
  message: string
  syncedAt: string
  results: {
    diaryEntries: Array<{ localId: string; serverId?: string; status: string }>
    todos: Array<{ localId: string; serverId?: string; status: string }>
    workouts: Array<{ localId: string; serverId?: string; status: string }>
    expenses: Array<{ localId: string; serverId?: string; status: string }>
  }
}

export type ServerStatus = 'online' | 'waking' | 'offline'

const STORAGE_KEYS = {
  DIARY_QUEUE: 'lifeos_offline_diary_queue',
  TODO_QUEUE: 'lifeos_offline_todo_queue',
  WORKOUT_QUEUE: 'lifeos_offline_workout_queue',
  EXPENSE_QUEUE: 'lifeos_offline_expense_queue',
  DIARY_CACHE: 'lifeos_diary_cache',
  TODOS_CACHE: 'lifeos_todos_cache',
  WORKOUTS_CACHE: 'lifeos_workouts_cache',
  EXPENSES_CACHE: 'lifeos_expenses_cache',
  SNAPSHOT_CACHE: 'lifeos_snapshot_cache',
}

function getStored<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setStored<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch (err) {
    console.error('Storage error:', err)
  }
}

class OfflineSyncManager {
  private isSyncing = false
  private serverStatus: ServerStatus = 'online'
  private probeTimer: any = null
  private listeners: Array<() => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Internet connection restored. Probing server & auto-syncing...')
        this.probeServer()
      })
      window.addEventListener('offline', () => {
        this.serverStatus = 'offline'
        this.notify()
      })

      // Proactively probe server on initial launch to detect if Render instance is sleeping
      setTimeout(() => this.probeServer(), 500)
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb())
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  public getServerStatus(): ServerStatus {
    if (!this.isOnline()) return 'offline'
    return this.serverStatus
  }

  public getPendingCount(): number {
    const diary = getStored<OfflineDiaryEntry>(STORAGE_KEYS.DIARY_QUEUE).length
    const todos = getStored<OfflineTodo>(STORAGE_KEYS.TODO_QUEUE).length
    const workouts = getStored<OfflineWorkout>(STORAGE_KEYS.WORKOUT_QUEUE).length
    const expenses = getStored<OfflineExpense>(STORAGE_KEYS.EXPENSE_QUEUE).length
    return diary + todos + workouts + expenses
  }

  // ── Cold-Start Probe & Wake-up Engine ───────────────────────────

  public async probeServer(): Promise<boolean> {
    if (!this.isOnline()) {
      this.serverStatus = 'offline'
      this.notify()
      return false
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)

    try {
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal })
      clearTimeout(timer)
      if (res.ok) {
        const wasWaking = this.serverStatus === 'waking'
        this.serverStatus = 'online'
        if (this.probeTimer) {
          clearInterval(this.probeTimer)
          this.probeTimer = null
        }
        this.notify()

        // If server just woke up, flush any queued items automatically!
        if (wasWaking || this.getPendingCount() > 0) {
          this.flushQueue()
        }
        return true
      } else {
        throw new Error('Server returned non-200')
      }
    } catch {
      clearTimeout(timer)
      this.serverStatus = 'waking'
      this.notify()

      // Set up background polling to detect when server wakes up
      if (!this.probeTimer) {
        this.probeTimer = setInterval(() => {
          this.probeServer()
        }, 4500)
      }
      return false
    }
  }

  // ── Queueing Methods (Stores items while server is sleeping) ─────

  public queueDiaryEntry(entry: Omit<OfflineDiaryEntry, 'localId' | 'createdAt'>): OfflineDiaryEntry {
    const fullEntry: OfflineDiaryEntry = {
      ...entry,
      localId: `offline_diary_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    }
    const queue = getStored<OfflineDiaryEntry>(STORAGE_KEYS.DIARY_QUEUE)
    queue.push(fullEntry)
    setStored(STORAGE_KEYS.DIARY_QUEUE, queue)

    // Update local cache optimistically
    const cache = getStored<any>(STORAGE_KEYS.DIARY_CACHE)
    cache.unshift({ ...fullEntry, id: fullEntry.localId })
    setStored(STORAGE_KEYS.DIARY_CACHE, cache)

    this.notify()

    if (this.serverStatus === 'online') {
      this.flushQueue()
    } else {
      this.probeServer()
    }
    return fullEntry
  }

  public queueTodo(todo: Omit<OfflineTodo, 'localId' | 'createdAt'>): OfflineTodo {
    const fullTodo: OfflineTodo = {
      ...todo,
      localId: `offline_todo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    }
    const queue = getStored<OfflineTodo>(STORAGE_KEYS.TODO_QUEUE)
    queue.push(fullTodo)
    setStored(STORAGE_KEYS.TODO_QUEUE, queue)

    // Update local cache optimistically
    const cache = getStored<any>(STORAGE_KEYS.TODOS_CACHE)
    cache.unshift({ ...fullTodo, id: fullTodo.localId })
    setStored(STORAGE_KEYS.TODOS_CACHE, cache)

    this.notify()

    if (this.serverStatus === 'online') {
      this.flushQueue()
    } else {
      this.probeServer()
    }
    return fullTodo
  }

  public queueWorkout(workout: Omit<OfflineWorkout, 'localId' | 'createdAt'>): OfflineWorkout {
    const fullWorkout: OfflineWorkout = {
      ...workout,
      localId: `offline_workout_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    }
    const queue = getStored<OfflineWorkout>(STORAGE_KEYS.WORKOUT_QUEUE)
    queue.push(fullWorkout)
    setStored(STORAGE_KEYS.WORKOUT_QUEUE, queue)

    // Update local cache optimistically
    const cache = getStored<any>(STORAGE_KEYS.WORKOUTS_CACHE)
    cache.unshift({ ...fullWorkout, id: fullWorkout.localId, workoutDate: fullWorkout.workoutDate || new Date().toISOString() })
    setStored(STORAGE_KEYS.WORKOUTS_CACHE, cache)

    this.notify()

    if (this.serverStatus === 'online') {
      this.flushQueue()
    } else {
      this.probeServer()
    }
    return fullWorkout
  }

  public queueExpense(expense: Omit<OfflineExpense, 'localId' | 'createdAt'>): OfflineExpense {
    const fullExp: OfflineExpense = {
      ...expense,
      localId: `offline_exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    }
    const queue = getStored<OfflineExpense>(STORAGE_KEYS.EXPENSE_QUEUE)
    queue.push(fullExp)
    setStored(STORAGE_KEYS.EXPENSE_QUEUE, queue)

    // Update local cache optimistically
    const cache = getStored<any>(STORAGE_KEYS.EXPENSES_CACHE)
    cache.unshift({ ...fullExp, id: fullExp.localId })
    setStored(STORAGE_KEYS.EXPENSES_CACHE, cache)

    this.notify()

    if (this.serverStatus === 'online') {
      this.flushQueue()
    } else {
      this.probeServer()
    }
    return fullExp
  }

  // ── Cache Methods ────────────────────────────────────────────────

  public cacheWorkouts(workouts: unknown[]): void {
    setStored(STORAGE_KEYS.WORKOUTS_CACHE, workouts)
  }

  public getCachedWorkouts<T = unknown>(): T[] {
    return getStored<T>(STORAGE_KEYS.WORKOUTS_CACHE)
  }

  public cacheDiary(entries: unknown[]): void {
    setStored(STORAGE_KEYS.DIARY_CACHE, entries)
  }

  public getCachedDiary<T = unknown>(): T[] {
    return getStored<T>(STORAGE_KEYS.DIARY_CACHE)
  }

  public cacheTodos(todos: unknown[]): void {
    setStored(STORAGE_KEYS.TODOS_CACHE, todos)
  }

  public getCachedTodos<T = unknown>(): T[] {
    return getStored<T>(STORAGE_KEYS.TODOS_CACHE)
  }

  public async fetchAndCacheSnapshot(): Promise<void> {
    if (!this.isOnline()) return
    try {
      const data = await api.get<Record<string, unknown>>('/sync/snapshot')
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SNAPSHOT_CACHE, JSON.stringify(data))
        if (Array.isArray(data.workouts)) this.cacheWorkouts(data.workouts)
        if (Array.isArray(data.diaryEntries)) this.cacheDiary(data.diaryEntries)
        if (Array.isArray(data.todos)) this.cacheTodos(data.todos)
      }
      this.serverStatus = 'online'
      this.notify()
    } catch {
      // If snapshot fails, server may be asleep
      this.probeServer()
    }
  }

  // ── Auto-Sync Flusher ───────────────────────────────────────────

  public async flushQueue(): Promise<SyncResponse | null> {
    if (this.isSyncing || !this.isOnline()) return null

    const diaryEntries = getStored<OfflineDiaryEntry>(STORAGE_KEYS.DIARY_QUEUE)
    const todos = getStored<OfflineTodo>(STORAGE_KEYS.TODO_QUEUE)
    const workouts = getStored<OfflineWorkout>(STORAGE_KEYS.WORKOUT_QUEUE)
    const expenses = getStored<OfflineExpense>(STORAGE_KEYS.EXPENSE_QUEUE)

    if (!diaryEntries.length && !todos.length && !workouts.length && !expenses.length) {
      return null
    }

    try {
      this.isSyncing = true
      this.notify()

      const payload: SyncPayload = { diaryEntries, todos, workouts, expenses }
      const res = await api.post<SyncResponse>('/sync', payload)

      // Clear queues on successful sync
      setStored(STORAGE_KEYS.DIARY_QUEUE, [])
      setStored(STORAGE_KEYS.TODO_QUEUE, [])
      setStored(STORAGE_KEYS.WORKOUT_QUEUE, [])
      setStored(STORAGE_KEYS.EXPENSE_QUEUE, [])

      this.serverStatus = 'online'
      this.notify()

      // Refresh snapshot in background
      this.fetchAndCacheSnapshot()

      return res
    } catch (err) {
      console.warn('Sync flush delayed (server waking up):', err)
      this.serverStatus = 'waking'
      this.notify()
      this.probeServer()
      return null
    } finally {
      this.isSyncing = false
      this.notify()
    }
  }
}

export const offlineSync = new OfflineSyncManager()
