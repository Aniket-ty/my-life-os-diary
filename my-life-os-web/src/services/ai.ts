import { api } from '@/lib/api'

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  contextType?: string | null
  actionTaken?: boolean
  createdAt: string
}

export interface ChatResponse {
  sessionId: string
  message: string
  messageId: string
  action?: {
    type: string
    data: Record<string, unknown>
  } | null
}

export interface AIAction {
  type: 'add_food' | 'add_workout' | string
  data: Record<string, unknown>
}

export const aiService = {
  chat: (message: string, sessionId?: string, contextType?: string) =>
    api.post<ChatResponse>('/ai/chat', { message, sessionId, contextType }),
  history: (sessionId?: string) =>
    api.get<ChatMessage[]>('/ai/history', { sessionId }),
  clear: (sessionId?: string) =>
    api.delete<{ message: string }>(`/ai/history${sessionId ? `?sessionId=${sessionId}` : ''}`),
  addFood: (data: {
    foodName: string
    calories: number
    proteinG?: number
    carbsG?: number
    fatG?: number
    mealType: string
    quantity?: string
  }) => api.post<{ message: string }>('/ai/add-food', data),
  addWorkout: (data: {
    workoutName?: string
    exercises: Array<{
      exerciseName: string
      sets?: number
      reps?: number
      weightKg?: number
    }>
  }) => api.post<{ message: string }>('/ai/add-workout', data),
}