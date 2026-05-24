import 'react-native-get-random-values';
import { create } from 'zustand';
import { aiAPI } from '../services/aiService';
import { v4 as uuidv4 } from 'uuid';

export const useAIStore = create((set, get) => ({
  messages: [],
  sessionId: uuidv4(),
  loading: false,
  pendingAction: null,

  sendMessage: async (text) => {
    const userMsg = { id: uuidv4(), role: 'user', content: text, createdAt: new Date() };
    set((s) => ({ messages: [...s.messages, userMsg], loading: true }));

    try {
      const res = await aiAPI.chat(text, get().sessionId);
      const aiMsg = { id: res.messageId || uuidv4(), role: 'assistant', content: res.message, createdAt: new Date() };
      set((s) => ({
        messages: [...s.messages, aiMsg],
        loading: false,
        pendingAction: res.action || null,
      }));
      return res;
    } catch (e) {
      const errMsg = { id: uuidv4(), role: 'assistant', content: 'Sorry, something went wrong. Try again.', createdAt: new Date() };
      set((s) => ({ messages: [...s.messages, errMsg], loading: false }));
    }
  },

  confirmAction: async (action) => {
    if (!action) return;
    try {
      if (action.type === 'log_food') await aiAPI.addFood(action.data);
      if (action.type === 'add_workout') await aiAPI.addWorkout(action.data);
      set({ pendingAction: null });
      return true;
    } catch (e) {
      return false;
    }
  },

  dismissAction: () => set({ pendingAction: null }),

  clearChat: async () => {
    await aiAPI.clearHistory(get().sessionId);
    set({ messages: [], sessionId: uuidv4(), pendingAction: null });
  },
}));
