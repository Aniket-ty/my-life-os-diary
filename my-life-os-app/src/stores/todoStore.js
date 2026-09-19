import { create } from 'zustand';
import { todoAPI } from '../services/todoService';
import { offlineSyncService } from '../services/offlineSyncService';

export const useTodoStore = create((set) => ({
  todos: [],
  loading: false,

  fetchTodos: async (category, completed) => {
    // 1. Optimistic load from local cache
    const cached = await offlineSyncService.getCachedTodos();
    if (cached && cached.length > 0) {
      let filtered = cached;
      if (category) filtered = filtered.filter((t) => t.category === category);
      if (completed !== undefined) filtered = filtered.filter((t) => t.isCompleted === completed);
      set({ todos: filtered });
    } else {
      set({ loading: true });
    }

    try {
      const data = await todoAPI.getTodos(category, completed);
      const list = Array.isArray(data) ? data : [];
      set({ todos: list, loading: false });
      await offlineSyncService.cacheTodos(list);
    } catch (e) {
      console.warn('Network error fetching todos, using offline cache:', e.message);
      const cached = await offlineSyncService.getCachedTodos();
      let filtered = cached;
      if (category) filtered = filtered.filter((t) => t.category === category);
      if (completed !== undefined) filtered = filtered.filter((t) => t.isCompleted === completed);
      set({ todos: filtered || [], loading: false });
    }
  },

  createTodo: async (data) => {
    try {
      const todo = await todoAPI.createTodo(data);
      set((s) => ({ todos: [todo, ...s.todos] }));
      const cached = await offlineSyncService.getCachedTodos();
      await offlineSyncService.cacheTodos([todo, ...cached.filter((t) => t.id !== todo.id)]);
      return todo;
    } catch (e) {
      console.warn('Network error creating todo, queueing offline:', e.message);
      const queued = await offlineSyncService.queueTodo(data);
      const localTodo = {
        ...data,
        id: queued.localId,
        localId: queued.localId,
        isCompleted: false,
        isPendingSync: true,
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ todos: [localTodo, ...s.todos] }));
      return localTodo;
    }
  },

  updateTodo: async (id, data) => {
    try {
      const updated = await todoAPI.updateTodo(id, data);
      set((s) => ({ todos: s.todos.map((t) => (t.id === id ? updated : t)) }));
      return updated;
    } catch (e) {
      set((s) => ({
        todos: s.todos.map((t) => (t.id === id ? { ...t, ...data } : t)),
      }));
    }
  },

  deleteTodo: async (id) => {
    try {
      await todoAPI.deleteTodo(id);
      set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
    } catch (e) {
      set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
    }
  },

  completeTodo: async (id) => {
    try {
      const updated = await todoAPI.completeTodo(id);
      set((s) => ({ todos: s.todos.map((t) => (t.id === id ? updated : t)) }));
    } catch (e) {
      set((s) => ({
        todos: s.todos.map((t) => (t.id === id ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t)),
      }));
    }
  },

  uncompleteTodo: async (id) => {
    try {
      const updated = await todoAPI.uncompleteTodo(id);
      set((s) => ({ todos: s.todos.map((t) => (t.id === id ? updated : t)) }));
    } catch (e) {
      set((s) => ({
        todos: s.todos.map((t) => (t.id === id ? { ...t, isCompleted: false, completedAt: null } : t)),
      }));
    }
  },
}));
