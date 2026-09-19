import { api } from '../config/api';

export const expenseService = {
  getSummary: async () => {
    const res = await api.get('/expenses/summary');
    return res.data;
  },

  getExpenses: async (params = {}) => {
    const res = await api.get('/expenses', { params });
    return res.data;
  },

  getExpenseById: async (id) => {
    const res = await api.get(`/expenses/${id}`);
    return res.data;
  },

  createExpense: async (payload) => {
    const res = await api.post('/expenses', payload);
    return res.data;
  },

  deleteExpense: async (id) => {
    const res = await api.delete(`/expenses/${id}`);
    return res.data;
  },

  getGroups: async () => {
    const res = await api.get('/groups');
    return res.data;
  },

  getGroupById: async (id) => {
    const res = await api.get(`/groups/${id}`);
    return res.data;
  },

  createGroup: async (payload) => {
    const res = await api.post('/groups', payload);
    return res.data;
  },

  addMember: async (groupId, payload) => {
    const res = await api.post(`/groups/${groupId}/members`, payload);
    return res.data;
  },

  createSettlement: async (payload) => {
    const res = await api.post('/settlements', payload);
    return res.data;
  },

  getReceipts: async () => {
    const res = await api.get('/receipts');
    return res.data;
  },

  scanReceipt: async (fileUri, mimeType = 'image/jpeg') => {
    const formData = new FormData();
    formData.append('receipt', {
      uri: fileUri,
      name: 'receipt.jpg',
      type: mimeType,
    });
    const res = await api.post('/receipts/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  createExpenseFromReceipt: async (receiptId, payload) => {
    const res = await api.post(`/receipts/${receiptId}/create-expense`, payload);
    return res.data;
  },

  processVoiceCommand: async (transcript) => {
    const res = await api.post('/voice/command', { transcript });
    return res.data;
  },

  confirmVoiceAction: async (serverCommandId, confirmed = true) => {
    const res = await api.post('/voice/confirm', { serverCommandId, confirmed });
    return res.data;
  },

  transcribeAndExecute: async (audioUri, mimeType = 'audio/m4a') => {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      name: 'recording.m4a',
      type: mimeType,
    });
    const res = await api.post('/voice/listen', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  searchUsers: async (q) => {
    if (!q || q.trim().length < 2) return [];
    const res = await api.get('/auth/users/search', { params: { q: q.trim() } });
    return res.data?.users || [];
  },

  getNotifications: async () => {
    const res = await api.get('/notifications');
    return res.data;
  },

  markNotificationAsRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllNotificationsAsRead: async () => {
    const res = await api.post('/notifications/mark-all-read');
    return res.data;
  },

  updateFcmToken: async (fcmToken) => {
    const res = await api.put('/auth/fcm-token', { fcmToken });
    return res.data;
  },
};
