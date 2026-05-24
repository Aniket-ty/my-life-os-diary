import { useAuthStore } from '../stores/authStore';

const BASE_URL = 'http://localhost:3000/api/v1';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
});

export const todoAPI = {
  getTodos: async (category, completed) => {
    let url = `${BASE_URL}/todos?`;
    if (category) url += `category=${category}&`;
    if (completed !== undefined) url += `completed=${completed}`;
    const res = await fetch(url, { headers: getHeaders() });
    return res.json();
  },
  createTodo: async (data) => {
    const res = await fetch(`${BASE_URL}/todos`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  updateTodo: async (id, data) => {
    const res = await fetch(`${BASE_URL}/todos/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteTodo: async (id) => {
    const res = await fetch(`${BASE_URL}/todos/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return res.json();
  },
  completeTodo: async (id) => {
    const res = await fetch(`${BASE_URL}/todos/${id}/complete`, {
      method: 'PATCH', headers: getHeaders(),
    });
    return res.json();
  },
  uncompleteTodo: async (id) => {
    const res = await fetch(`${BASE_URL}/todos/${id}/uncomplete`, {
      method: 'PATCH', headers: getHeaders(),
    });
    return res.json();
  },
};
