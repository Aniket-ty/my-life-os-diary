import { useAuthStore } from '../stores/authStore';

const BASE_URL = 'http://localhost:3000/api/v1';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
});

export const aiAPI = {
  chat: async (message, sessionId, contextType = 'general') => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, sessionId, contextType }),
    });
    return res.json();
  },
  getHistory: async (sessionId) => {
    const res = await fetch(`${BASE_URL}/ai/history?sessionId=${sessionId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },
  addFood: async (data) => {
    const res = await fetch(`${BASE_URL}/ai/add-food`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  addWorkout: async (data) => {
    const res = await fetch(`${BASE_URL}/ai/add-workout`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  clearHistory: async (sessionId) => {
    const res = await fetch(`${BASE_URL}/ai/history?sessionId=${sessionId}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return res.json();
  },
};
