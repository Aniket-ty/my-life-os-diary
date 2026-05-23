import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../config/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  init: async () => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) { set({ isLoading: false }); return; }
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
      set({ accessToken: data.accessToken, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync('refreshToken');
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    set({ user: data.user, accessToken: data.accessToken });
  },

  register: async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    set({ user: data.user, accessToken: data.accessToken });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('refreshToken');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, accessToken: null });
  },
}));
