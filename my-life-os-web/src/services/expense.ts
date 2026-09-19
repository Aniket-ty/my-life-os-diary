import { api } from '../lib/api'

export interface ExpenseSplit {
  id: string
  userId: string
  userName?: string
  amount: number
  percentage?: number | null
  shares?: number | null
}

export interface Expense {
  id: string
  title: string
  amount: number
  originalAmount: number
  currency: string
  baseAmount: number
  baseCurrency: string
  exchangeRate?: string
  category: string
  expenseDate: string
  paymentMethod?: string | null
  notes?: string | null
  source?: 'MANUAL' | 'VOICE' | 'OCR' | 'IMPORT'
  paidById?: string | null
  paidBy?: { id: string; name: string; email?: string } | null
  groupId?: string | null
  group?: { id: string; name: string; defaultCurrency?: string } | null
  receiptId?: string | null
  receipt?: { id: string; imageUrl?: string; merchant?: string } | null
  splits?: ExpenseSplit[]
  createdAt?: string
  updatedAt?: string
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
}

export interface DailyTrendItem {
  date: string
  total: number
}

export interface ExpenseSummary {
  currency: string
  today: {
    total: number
    categories: Record<string, number>
  }
  thisWeek: {
    total: number
  }
  thisMonth: {
    total: number
    categories: CategoryBreakdown[]
  }
  dailyTrend: DailyTrendItem[]
  recentExpenses: Expense[]
  largestExpenses: Expense[]
}

export interface ExpenseListResponse {
  expenses: Expense[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ExpenseFilters {
  startDate?: string
  endDate?: string
  category?: string
  source?: string
  groupId?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export const expenseService = {
  getSummary: () => api.get<ExpenseSummary>('/expenses/summary'),
  getCategories: () => api.get<{ categories: string[] }>('/expenses/categories'),
  getExpenses: (filters?: ExpenseFilters) =>
    api.get<ExpenseListResponse>('/expenses', filters as Record<string, unknown>),
  getExpenseById: (id: string) => api.get<Expense>(`/expenses/${id}`),
  createExpense: (data: Partial<Expense> & { splitType?: string; idempotencyKey?: string }) =>
    api.post<Expense>('/expenses', data),
  updateExpense: (id: string, data: Partial<Expense> & { splitType?: string }) =>
    api.put<Expense>(`/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete<void>(`/expenses/${id}`),
}
