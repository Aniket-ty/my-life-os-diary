import { api } from '../lib/api'
import type { Expense } from './expense'

export interface ReceiptLineItem {
  name: string
  quantity?: number
  amount: number
}

export interface Receipt {
  id: string
  userId: string
  expenseId?: string | null
  imageUrl: string
  merchant?: string | null
  receiptDate?: string | null
  currency?: string | null
  subtotal?: number | null
  tax?: number | null
  tip?: number | null
  total?: number | null
  items?: ReceiptLineItem[]
  rawText?: string | null
  processingStatus: 'extracted' | 'reviewed' | 'converted'
  createdAt: string
  expense?: Expense | null
}

export interface ItemSplitAssignment {
  name: string
  amount: number
  assignedUserIds: string[]
}

export interface SplitPreviewResult {
  memberShares: Record<
    string,
    {
      itemSubtotal: number
      taxShare: number
      tipShare: number
      total: number
    }
  >
  totalCalculated: number
  sumCheck: boolean
}

export const receiptService = {
  scanReceipt: (file: File) => {
    const formData = new FormData()
    formData.append('receipt', file)
    return api.upload<{ receipt: Receipt; possibleDuplicate: boolean }>('/receipts/scan', formData)
  },
  getReceipts: () => api.get<Receipt[]>('/receipts'),
  getReceiptById: (id: string) => api.get<Receipt>(`/receipts/${id}`),
  updateReceipt: (id: string, data: Partial<Receipt>) => api.put<Receipt>(`/receipts/${id}`, data),
  previewSplits: (data: {
    items: ItemSplitAssignment[]
    subtotal: number
    tax: number
    tip: number
    total: number
    taxAllocation: 'proportional' | 'equal'
    allMemberIds?: string[]
  }) => api.post<SplitPreviewResult>('/receipts/preview-splits', data),
  createExpenseFromReceipt: (
    id: string,
    data: {
      title?: string
      category?: string
      groupId?: string
      paidById?: string
      splitType?: string
      itemSplits?: ItemSplitAssignment[]
      taxAllocation?: 'proportional' | 'equal'
    },
  ) => api.post<Expense>(`/receipts/${id}/create-expense`, data),
}
