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
      const me = await api.get('/auth/me');
      set({ accessToken: data.accessToken, user: me.data.user, isLoading: false });
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

  register: async (email, password, name, phoneNumber) => {
    const { data } = await api.post('/auth/register', {
      email,
      password,
      name,
      phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
    });
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    set({ user: data.user, accessToken: data.accessToken });
  },

  completeOnboarding: async (payload) => {
    const { data } = await api.post('/auth/onboarding', payload);
    set({ user: data.user });
    return data;
  },

  updateProfile: async (payload) => {
    const { data } = await api.put('/auth/profile', payload);
    set({ user: data.user });
    return data.user;
  },

  deleteAccount: async (password) => {
    await api.delete('/auth/account', { data: { password } });
    await SecureStore.deleteItemAsync('refreshToken');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, accessToken: null });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('refreshToken');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, accessToken: null });
  },
}));