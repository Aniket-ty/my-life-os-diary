import { api } from '@/lib/api'

export interface InAppNotification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'expense' | 'settlement' | 'group' | 'split' | string
  data?: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: InAppNotification[]
  unreadCount: number
}

export const notificationService = {
  async getNotifications(): Promise<NotificationsResponse> {
    return api.get<NotificationsResponse>('/notifications')
  },

  async markAsRead(id: string): Promise<InAppNotification> {
    return api.patch<InAppNotification>(`/notifications/${id}/read`)
  },

  async markAllAsRead(): Promise<{ message: string }> {
    return api.post<{ message: string }>('/notifications/mark-all-read')
  },

  async searchUsers(query: string): Promise<Array<{ id: string; name: string; email: string; phoneNumber?: string | null }>> {
    if (!query || query.trim().length < 2) return []
    const res = await api.get<{ users: Array<{ id: string; name: string; email: string; phoneNumber?: string | null }> }>(
      `/auth/users/search?q=${encodeURIComponent(query.trim())}`
    )
    return res.users || []
  },

  async updateFcmToken(fcmToken: string): Promise<void> {
    await api.put('/auth/fcm-token', { fcmToken })
  },
}
