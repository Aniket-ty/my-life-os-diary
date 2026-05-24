import { create } from 'zustand';
import { diaryAPI } from '../services/diaryService';

export const useDiaryStore = create((set, get) => ({
  entries: [],
  currentEntry: null,
  loading: false,
  error: null,

  fetchEntries: async () => {
    set({ loading: true, error: null });
    try {
      const data = await diaryAPI.getEntries();
      set({ entries: data.entries || [], loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  fetchEntry: async (id) => {
    set({ loading: true });
    try {
      const entry = await diaryAPI.getEntry(id);
      set({ currentEntry: entry, loading: false });
      return entry;
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  createEntry: async (data) => {
    try {
      const entry = await diaryAPI.createEntry(data);
      set((state) => ({ entries: [entry, ...state.entries] }));
      return entry;
    } catch (e) {
      set({ error: e.message });
    }
  },

  updateEntry: async (id, data) => {
    try {
      const updated = await diaryAPI.updateEntry(id, data);
      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? updated : e)),
        currentEntry: updated,
      }));
      return updated;
    } catch (e) {
      set({ error: e.message });
    }
  },

  deleteEntry: async (id) => {
    try {
      await diaryAPI.deleteEntry(id);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
      }));
    } catch (e) {
      set({ error: e.message });
    }
  },

  uploadMedia: async (entryId, fileUri, mediaType, fileName) => {
    try {
      const attachment = await diaryAPI.uploadMedia(entryId, fileUri, mediaType, fileName);
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === entryId
            ? { ...e, attachments: [...(e.attachments || []), attachment] }
            : e
        ),
        currentEntry: state.currentEntry?.id === entryId
          ? { ...state.currentEntry, attachments: [...(state.currentEntry.attachments || []), attachment] }
          : state.currentEntry,
      }));
      return attachment;
    } catch (e) {
      set({ error: e.message });
    }
  },
}));
