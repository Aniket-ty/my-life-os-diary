import { api } from '../lib/api'
import type { Expense } from './expense'

export interface GroupMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  joinedAt?: string
}

export interface GroupMemberBalance {
  userId: string
  name: string
  paid: number
  owed: number
  net: number
}

export interface SuggestedSettlement {
  fromUserId: string
  fromName: string
  toUserId: string
  toName: string
  amount: number
}

export interface GroupDebt {
  fromUserId: string
  fromName: string
  toUserId: string
  toName: string
  amount: number
}

export interface GroupSettlement {
  id: string
  groupId: string
  fromUserId: string
  toUserId: string
  amount: number
  currency: string
  note?: string
  settledAt: string
  fromUser?: { id: string; name: string; email?: string }
  toUser?: { id: string; name: string; email?: string }
}

export interface Group {
  id: string
  name: string
  description?: string
  defaultCurrency: string
  createdBy: string
  createdAt: string
  updatedAt: string
  memberCount: number
  members: GroupMember[]
  totalExpenseCount?: number
  totalPaid?: number
  userNetBalance?: number
}

export interface GroupDetail extends Group {
  expenses: Expense[]
  settlements: GroupSettlement[]
  balances: GroupMemberBalance[]
  debts: GroupDebt[]
  suggestedSettlements: SuggestedSettlement[]
  totalSpent: number
}

export const groupService = {
  getUserGroups: () => api.get<Group[]>('/groups'),
  getGroupById: (id: string) => api.get<GroupDetail>(`/groups/${id}`),
  createGroup: (data: { name: string; description?: string; defaultCurrency?: string; memberEmails?: string[] }) =>
    api.post<Group>('/groups', data),
  updateGroup: (id: string, data: { name?: string; description?: string; defaultCurrency?: string }) =>
    api.put<Group>(`/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete<void>(`/groups/${id}`),
  addMember: (groupId: string, data: { email?: string; phoneNumber?: string; userId?: string; role?: string }) =>
    api.post<any>(`/groups/${groupId}/members`, data),
  removeMember: (groupId: string, memberId: string) =>
    api.delete<void>(`/groups/${groupId}/members/${memberId}`),
  leaveGroup: (groupId: string) => api.post<void>(`/groups/${groupId}/leave`),
  exportGroupCsvUrl: (groupId: string) => `/groups/${groupId}/export/csv`,
}
