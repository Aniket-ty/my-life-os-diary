import { create } from 'zustand';
import { workoutPlanAPI } from '../services/workoutPlanService';

export const useWorkoutPlanStore = create((set, get) => ({
  plans: [],
  activePlan: null,
  loading: false,
  generating: false,
  error: null,

  fetchPlans: async () => {
    set({ loading: true, error: null });
    try {
      const plans = await workoutPlanAPI.getPlans();
      const active = plans.find((p) => p.isActive) || plans[0] || null;
      set({ plans, activePlan: active, loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },

  generateAndSave: async (input) => {
    set({ generating: true, error: null });
    try {
      const generated = await workoutPlanAPI.generate(input);
      const saved = await workoutPlanAPI.createPlan({
        ...generated,
        generatedByAI: true,
        isActive: true,
        goal: input.goal,
        fitnessLevel: input.fitnessLevel,
        equipment: input.equipment || [],
        daysPerWeek: input.daysPerWeek,
      });
      // Deactivate other plans
      await Promise.all(
        get().plans.filter((p) => p.isActive).map((p) => workoutPlanAPI.updatePlan(p.id, { isActive: false }))
      );
      await workoutPlanAPI.updatePlan(saved.id, { isActive: true });
      await get().fetchPlans();

      // Auto-apply today's workout from the plan
      const todayDow = new Date().getDay(); // 0=Sun, 1=Mon ...
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayPlanDay = (saved.days || []).find((d) => d.dayNumber === todayDow && !d.restDay);
      if (todayPlanDay) {
        try {
          await workoutPlanAPI.applyDay(saved.id, todayPlanDay.id, todayStr);
        } catch { /* ignore if auto-apply fails */ }
      }

      return saved;
    } catch (e) {
      set({ error: e.message, generating: false });
      throw e;
    } finally {
      set({ generating: false });
    }
  },

  updateDay: async (planId, dayId, data) => {
    await workoutPlanAPI.updateDay(planId, dayId, data);
    await get().fetchPlans();
  },

  applyDay: async (planId, dayId, date) => {
    await workoutPlanAPI.applyDay(planId, dayId, date);
  },

  activatePlan: async (planId) => {
    await Promise.all(
      get().plans.map((p) => p.isActive && p.id !== planId
        ? workoutPlanAPI.updatePlan(p.id, { isActive: false })
        : Promise.resolve())
    );
    await workoutPlanAPI.updatePlan(planId, { isActive: true });
    await get().fetchPlans();
  },

  deletePlan: async (planId) => {
    await workoutPlanAPI.deletePlan(planId);
    await get().fetchPlans();
  },
}));