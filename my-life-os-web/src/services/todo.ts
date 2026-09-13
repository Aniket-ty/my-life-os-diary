import { api } from '@/lib/api'
import type { Priority } from '@/lib/utils'

export interface Todo {
  id: string
  title: string
  description?: string | null
  category?: string | null
  priority: Priority
  isCompleted: boolean
  dueDate?: string | null
  reminderAt?: string | null
  reminderSent: boolean
  isRecurring: boolean
  recurPattern?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface NewTodo {
  title: string
  description?: string
  category?: string
  priority?: Priority
  dueDate?: string
  reminderAt?: string
  isRecurring?: boolean
  recurPattern?: string
}

export const todoService = {
  list: () => api.get<Todo[]>('/todos'),
  create: (todo: NewTodo) => api.post<Todo>('/todos', todo),
  update: (id: string, todo: Partial<NewTodo>) => api.put<Todo>(`/todos/${id}`, todo),
  remove: (id: string) => api.delete<{ message: string }>(`/todos/${id}`),
  complete: (id: string) => api.patch<Todo | { message: string; todo: Todo }>(`/todos/${id}/complete`),
  uncomplete: (id: string) => api.patch<Todo>(`/todos/${id}/uncomplete`),
}