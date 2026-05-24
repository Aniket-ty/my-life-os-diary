import { create } from 'zustand';
import { fitnessAPI } from '../services/fitnessService';
import moment from 'moment';

export const useFitnessStore = create((set, get) => ({
  workouts: [],
  summary: null,
  nutrition: [],
  goals: null,
  loading: false,

  fetchWorkouts: async (date) => {
    set({ loading: true });
    try {
      const data = await fitnessAPI.getWorkouts(date);
      set({ workouts: Array.isArray(data) ? data : [], loading: false });
    } catch (e) {
      set({ loading: false });
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
    const workout = await fitnessAPI.createWorkout(data);
    set((s) => ({ workouts: [workout, ...s.workouts] }));
    return workout;
  },

  updateWorkout: async (id, data) => {
    const updated = await fitnessAPI.updateWorkout(id, data);
    set((s) => ({ workouts: s.workouts.map((w) => (w.id === id ? updated : w)) }));
    return updated;
  },

  deleteWorkout: async (id) => {
    await fitnessAPI.deleteWorkout(id);
    set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }));
  },

  logFood: async (data) => {
    const log = await fitnessAPI.logFood(data);
    set((s) => ({ nutrition: [...s.nutrition, log] }));
    await get().fetchSummary(moment().format('YYYY-MM-DD'));
    return log;
  },

  deleteFood: async (id) => {
    await fitnessAPI.deleteFood(id);
    set((s) => ({ nutrition: s.nutrition.filter((n) => n.id !== id) }));
    await get().fetchSummary(moment().format('YYYY-MM-DD'));
  },

  upsertGoals: async (data) => {
    const goals = await fitnessAPI.upsertGoals(data);
    set({ goals });
    return goals;
  },
}));
