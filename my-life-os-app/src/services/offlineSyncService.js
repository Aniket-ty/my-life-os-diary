import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { api, API_BASE_URL } from '../config/api';

const STORAGE_KEYS = {
  DIARY_QUEUE: '@lifeos_offline_diary_queue',
  TODO_QUEUE: '@lifeos_offline_todo_queue',
  WORKOUT_QUEUE: '@lifeos_offline_workout_queue',
  EXPENSE_QUEUE: '@lifeos_offline_expense_queue',
  DIARY_CACHE: '@lifeos_diary_cache',
  TODOS_CACHE: '@lifeos_todos_cache',
  WORKOUTS_CACHE: '@lifeos_workouts_cache',
  EXPENSES_CACHE: '@lifeos_expenses_cache',
  SNAPSHOT_CACHE: '@lifeos_snapshot_cache',
};

class OfflineSyncService {
  constructor() {
    this.isSyncing = false;
    this.serverStatus = 'online';
    this.probeTimer = null;
    this.listeners = [];

    // Proactively probe server on startup to check for cold start
    setTimeout(() => this.probeServer(), 800);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  notify() {
    this.listeners.forEach((cb) => cb());
  }

  async isOnline() {
    try {
      const state = await Network.getNetworkStateAsync();
      return Boolean(state.isConnected && state.isInternetReachable !== false);
    } catch {
      return true;
    }
  }

  getServerStatus() {
    return this.serverStatus;
  }

  async getQueue(key) {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async setQueue(key, items) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
      console.error('AsyncStorage error:', e);
    }
  }

  async getPendingCount() {
    const [diary, todos, workouts, expenses] = await Promise.all([
      this.getQueue(STORAGE_KEYS.DIARY_QUEUE),
      this.getQueue(STORAGE_KEYS.TODO_QUEUE),
      this.getQueue(STORAGE_KEYS.WORKOUT_QUEUE),
      this.getQueue(STORAGE_KEYS.EXPENSE_QUEUE),
    ]);
    return diary.length + todos.length + workouts.length + expenses.length;
  }

  // ── Cold-Start Server Probe & Wakeup ─────────────────────────────

  async probeServer() {
    const online = await this.isOnline();
    if (!online) {
      this.serverStatus = 'offline';
      this.notify();
      return false;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const wasWaking = this.serverStatus === 'waking';
        this.serverStatus = 'online';
        if (this.probeTimer) {
          clearInterval(this.probeTimer);
          this.probeTimer = null;
        }
        this.notify();

        if (wasWaking || (await this.getPendingCount()) > 0) {
          this.flushQueue();
        }
        return true;
      }
      throw new Error('Server not ready');
    } catch {
      clearTimeout(timer);
      this.serverStatus = 'waking';
      this.notify();

      if (!this.probeTimer) {
        this.probeTimer = setInterval(() => {
          this.probeServer();
        }, 4500);
      }
      return false;
    }
  }

  // ── Queue Offline Items ──────────────────────────────────────────

  async queueDiaryEntry(entry) {
    const item = {
      ...entry,
      localId: `offline_diary_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const queue = await this.getQueue(STORAGE_KEYS.DIARY_QUEUE);
    queue.push(item);
    await this.setQueue(STORAGE_KEYS.DIARY_QUEUE, queue);

    // Optimistically update cache
    const cache = await this.getCachedDiary();
    cache.unshift({ ...item, id: item.localId });
    await this.cacheDiary(cache);

    this.notify();

    if (this.serverStatus === 'online') {
      this.flushQueue();
    } else {
      this.probeServer();
    }
    return item;
  }

  async queueTodo(todo) {
    const item = {
      ...todo,
      localId: `offline_todo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const queue = await this.getQueue(STORAGE_KEYS.TODO_QUEUE);
    queue.push(item);
    await this.setQueue(STORAGE_KEYS.TODO_QUEUE, queue);

    // Optimistically update cache
    const cache = await this.getCachedTodos();
    cache.unshift({ ...item, id: item.localId });
    await this.cacheTodos(cache);

    this.notify();

    if (this.serverStatus === 'online') {
      this.flushQueue();
    } else {
      this.probeServer();
    }
    return item;
  }

  async queueWorkout(workout) {
    const item = {
      ...workout,
      localId: `offline_workout_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const queue = await this.getQueue(STORAGE_KEYS.WORKOUT_QUEUE);
    queue.push(item);
    await this.setQueue(STORAGE_KEYS.WORKOUT_QUEUE, queue);

    // Optimistically update cache
    const cache = await this.getCachedWorkouts();
    cache.unshift({ ...item, id: item.localId, workoutDate: item.workoutDate || new Date().toISOString() });
    await this.cacheWorkouts(cache);

    this.notify();

    if (this.serverStatus === 'online') {
      this.flushQueue();
    } else {
      this.probeServer();
    }
    return item;
  }

  async queueExpense(expense) {
    const item = {
      ...expense,
      localId: `offline_exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const queue = await this.getQueue(STORAGE_KEYS.EXPENSE_QUEUE);
    queue.push(item);
    await this.setQueue(STORAGE_KEYS.EXPENSE_QUEUE, queue);

    this.notify();

    if (this.serverStatus === 'online') {
      this.flushQueue();
    } else {
      this.probeServer();
    }
    return item;
  }

  // ── Workouts & Snapshot Caching ──────────────────────────────────

  async cacheWorkouts(workouts) {
    await this.setQueue(STORAGE_KEYS.WORKOUTS_CACHE, workouts);
  }

  async getCachedWorkouts() {
    return this.getQueue(STORAGE_KEYS.WORKOUTS_CACHE);
  }

  async cacheDiary(entries) {
    await this.setQueue(STORAGE_KEYS.DIARY_CACHE, entries);
  }

  async getCachedDiary() {
    return this.getQueue(STORAGE_KEYS.DIARY_CACHE);
  }

  async cacheTodos(todos) {
    await this.setQueue(STORAGE_KEYS.TODOS_CACHE, todos);
  }

  async getCachedTodos() {
    return this.getQueue(STORAGE_KEYS.TODOS_CACHE);
  }

  async fetchAndCacheSnapshot() {
    if (!(await this.isOnline())) return;
    try {
      const res = await api.get('/sync/snapshot');
      if (res.data) {
        await AsyncStorage.setItem(STORAGE_KEYS.SNAPSHOT_CACHE, JSON.stringify(res.data));
        if (Array.isArray(res.data.workouts)) await this.cacheWorkouts(res.data.workouts);
        if (Array.isArray(res.data.diaryEntries)) await this.cacheDiary(res.data.diaryEntries);
        if (Array.isArray(res.data.todos)) await this.cacheTodos(res.data.todos);
      }
      this.serverStatus = 'online';
      this.notify();
    } catch {
      this.probeServer();
    }
  }

  // ── Auto Flush Queues to Server ──────────────────────────────────

  async flushQueue() {
    if (this.isSyncing || !(await this.isOnline())) return null;

    const [diaryEntries, todos, workouts, expenses] = await Promise.all([
      this.getQueue(STORAGE_KEYS.DIARY_QUEUE),
      this.getQueue(STORAGE_KEYS.TODO_QUEUE),
      this.getQueue(STORAGE_KEYS.WORKOUT_QUEUE),
      this.getQueue(STORAGE_KEYS.EXPENSE_QUEUE),
    ]);

    if (!diaryEntries.length && !todos.length && !workouts.length && !expenses.length) {
      return null;
    }

    try {
      this.isSyncing = true;
      this.notify();

      const payload = { diaryEntries, todos, workouts, expenses };
      const res = await api.post('/sync', payload);

      // Clear queues on success
      await Promise.all([
        this.setQueue(STORAGE_KEYS.DIARY_QUEUE, []),
        this.setQueue(STORAGE_KEYS.TODO_QUEUE, []),
        this.setQueue(STORAGE_KEYS.WORKOUT_QUEUE, []),
        this.setQueue(STORAGE_KEYS.EXPENSE_QUEUE, []),
      ]);

      this.serverStatus = 'online';
      this.notify();

      // Refresh snapshot in background
      this.fetchAndCacheSnapshot();

      return res.data;
    } catch (err) {
      console.warn('Offline flush delayed (server waking up):', err.message);
      this.serverStatus = 'waking';
      this.notify();
      this.probeServer();
      return null;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
