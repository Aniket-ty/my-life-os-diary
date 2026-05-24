import { create } from 'zustand';
import { todoAPI } from '../services/todoService';

export const useTodoStore = create((set) => ({
  todos: [],
  loading: false,

  fetchTodos: async (category, completed) => {
    set({ loading: true });
    try {
      const data = await todoAPI.getTodos(category, completed);
      set({ todos: Array.isArray(data) ? data : [], loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  createTodo: async (data) => {
    const todo = await todoAPI.createTodo(data);
    set((s) => ({ todos: [todo, ...s.todos] }));
    return todo;
  },

  updateTodo: async (id, data) => {
    const updated = await todoAPI.updateTodo(id, data);
    set((s) => ({ todos: s.todos.map((t) => (t.id === id ? updated : t)) }));
    return updated;
  },

  deleteTodo: async (id) => {
    await todoAPI.deleteTodo(id);
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
  },

  completeTodo: async (id) => {
    const updated = await todoAPI.completeTodo(id);
    set((s) => ({ todos: s.todos.map((t) => (t.id === id ? updated : t)) }));
  },

  uncompleteTodo: async (id) => {
    const updated = await todoAPI.uncompleteTodo(id);
    set((s) => ({ todos: s.todos.map((t) => (t.id === id ? updated : t)) }));
  },
}));
