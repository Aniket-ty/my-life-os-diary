import { create } from 'zustand';
import { fitnessAPI } from '../services/fitnessService';
import { offlineSyncService } from '../services/offlineSyncService';
import moment from 'moment';

export const useFitnessStore = create((set, get) => ({
  workouts: [],
  summary: null,
  nutrition: [],
  goals: null,
  loading: false,

  fetchWorkouts: async (date) => {
    // 1. Optimistically load cached workouts so UI is instant
    const cached = await offlineSyncService.getCachedWorkouts();
    if (cached && cached.length > 0) {
      const filtered = date
        ? cached.filter((w) => moment(w.workoutDate).format('YYYY-MM-DD') === moment(date).format('YYYY-MM-DD'))
        : cached;
      if (filtered.length > 0) {
        set({ workouts: filtered });
      }
    } else {
      set({ loading: true });
    }

    try {
      const data = await fitnessAPI.getWorkouts(date);
      const list = Array.isArray(data) ? data : [];
      set({ workouts: list, loading: false });
      await offlineSyncService.cacheWorkouts(list);
    } catch (e) {
      console.warn('Network error fetching workouts, using offline cache:', e.message);
      const cached = await offlineSyncService.getCachedWorkouts();
      const filtered = date
        ? cached.filter((w) => moment(w.workoutDate).format('YYYY-MM-DD') === moment(date).format('YYYY-MM-DD'))
        : cached;
      set({ workouts: filtered || [], loading: false });
    }
  },

  fetchSummary: async (date) => {
    try {
      const data = await fitnessAPI.getDailySummary(date);
      set({ summary: data });
    } catch (e) {}
  },

  fetchNutrition: async (date) => {
    try {
      const data = await fitnessAPI.getNutrition(date);
      set({ nutrition: Array.isArray(data) ? data : [] });
    } catch (e) {}
  },

  fetchGoals: async () => {
    try {
      const data = await fitnessAPI.getGoals();
      set({ goals: data });
    } catch (e) {}
  },

  createWorkout: async (data) => {
    try {
      const workout = await fitnessAPI.createWorkout(data);
      set((s) => ({ workouts: [workout, ...s.workouts] }));
      const cached = await offlineSyncService.getCachedWorkouts();
      await offlineSyncService.cacheWorkouts([workout, ...cached.filter((w) => w.id !== workout.id)]);
      return workout;
    } catch (e) {
      console.warn('Network error creating workout, queueing offline:', e.message);
      const queued = await offlineSyncService.queueWorkout(data);
      const localWorkout = {
        ...data,
        id: queued.localId,
        localId: queued.localId,
        isPendingSync: true,
        createdAt: new Date().toISOString(),
        exercises: data.exercises || [],
      };
      set((s) => ({ workouts: [localWorkout, ...s.workouts] }));
      return localWorkout;
    }
  },

  updateWorkout: async (id, data) => {
    try {
      const updated = await fitnessAPI.updateWorkout(id, data);
      set((s) => ({ workouts: s.workouts.map((w) => (w.id === id ? updated : w)) }));
      return updated;
    } catch (e) {
      set((s) => ({
        workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...data } : w)),
      }));
    }
  },

  deleteWorkout: async (id) => {
    try {
      await fitnessAPI.deleteWorkout(id);
      set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }));
    } catch (e) {
      set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }));
    }
  },

  logFood: async (data) => {
    try {
      const log = await fitnessAPI.logFood(data);
      set((s) => ({ nutrition: [...s.nutrition, log] }));
      await get().fetchSummary(moment().format('YYYY-MM-DD'));
      return log;
    } catch (e) {
      const localLog = { ...data, id: `offline_food_${Date.now()}` };
      set((s) => ({ nutrition: [...s.nutrition, localLog] }));
      return localLog;
    }
  },

  deleteFood: async (id) => {
    try {
      await fitnessAPI.deleteFood(id);
      set((s) => ({ nutrition: s.nutrition.filter((n) => n.id !== id) }));
      await get().fetchSummary(moment().format('YYYY-MM-DD'));
    } catch (e) {
      set((s) => ({ nutrition: s.nutrition.filter((n) => n.id !== id) }));
    }
  },

  upsertGoals: async (data) => {
    try {
      const goals = await fitnessAPI.upsertGoals(data);
      set({ goals });
      return goals;
    } catch (e) {}
  },
}));
