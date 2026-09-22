import { create } from 'zustand';
import { diaryAPI } from '../services/diaryService';
import { offlineSyncService } from '../services/offlineSyncService';

export const useDiaryStore = create((set, get) => ({
  entries: [],
  currentEntry: null,
  loading: false,
  error: null,

  fetchEntries: async () => {
    // 1. Optimistic load from local cache so the screen is never blank while waiting for Render
    const cached = await offlineSyncService.getCachedDiary();
    if (cached && cached.length > 0) {
      set({ entries: cached });
    } else {
      set({ loading: true, error: null });
    }

    try {
      const data = await diaryAPI.getEntries();
      const entries = data.entries || [];
      set({ entries, loading: false, error: null });
      await offlineSyncService.cacheDiary(entries);
    } catch (e) {
      console.warn('Network error fetching diary, using offline cache:', e.message);
      const cached = await offlineSyncService.getCachedDiary();
      set({ entries: cached || [], loading: false, error: null });
    }
  },

  fetchEntry: async (id) => {
    set({ loading: true });
    try {
      const entry = await diaryAPI.getEntry(id);
      set({ currentEntry: entry, loading: false });
      return entry;
    } catch (e) {
      // Look up in cached entries
      const cached = await offlineSyncService.getCachedDiary();
      const found = cached.find((item) => item.id === id || item.localId === id);
      if (found) {
        set({ currentEntry: found, loading: false });
        return found;
      }
      set({ error: e.message, loading: false });
    }
  },

  createEntry: async (data) => {
    try {
      const entry = await diaryAPI.createEntry(data);
      set((state) => ({ entries: [entry, ...state.entries] }));
      const cached = await offlineSyncService.getCachedDiary();
      await offlineSyncService.cacheDiary([entry, ...cached.filter((e) => e.id !== entry.id)]);
      return entry;
    } catch (e) {
      console.warn('Network error creating diary entry, queueing offline:', e.message);
      const queued = await offlineSyncService.queueDiaryEntry(data);
      const localEntry = {
        ...data,
        id: queued.localId,
        localId: queued.localId,
        isPendingSync: true,
        createdAt: new Date().toISOString(),
        attachments: [],
      };
      set((state) => ({ entries: [localEntry, ...state.entries], error: null }));
      return localEntry;
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
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
      }));
    }
  },

  uploadMedia: async (entryId, fileUri, mediaType, fileName, mimeType = null) => {
    try {
      const attachment = await diaryAPI.uploadMedia(entryId, fileUri, mediaType, fileName, mimeType);
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

  deleteMedia: async (entryId, mediaId) => {
    try {
      await diaryAPI.deleteMedia(entryId, mediaId);
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === entryId
            ? { ...e, attachments: (e.attachments || []).filter((a) => a.id !== mediaId) }
            : e
        ),
        currentEntry: state.currentEntry?.id === entryId
          ? { ...state.currentEntry, attachments: (state.currentEntry.attachments || []).filter((a) => a.id !== mediaId) }
          : state.currentEntry,
      }));
    } catch (e) {
      set({ error: e.message });
    }
  },
}));
