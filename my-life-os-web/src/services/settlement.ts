import { api } from '../lib/api'
import type { GroupSettlement } from './group'

export const settlementService = {
  createSettlement: (data: {
    groupId: string
    fromUserId: string
    toUserId: string
    amount: number
    currency?: string
    note?: string
    settledAt?: string
  }) => api.post<GroupSettlement>('/settlements', data),
  getGroupSettlements: (groupId: string) =>
    api.get<GroupSettlement[]>(`/settlements/group/${groupId}`),
  deleteSettlement: (id: string) => api.delete<void>(`/settlements/${id}`),
}
