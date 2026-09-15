import { api } from '@/lib/api'

export interface PlanExercise {
  name: string
  sets?: number
  reps?: string
  weightKg?: number
  durationSec?: number
  distanceKm?: number
}

export interface PlanDay {
  id?: string
  dayNumber: number
  workoutName?: string
  muscleGroup?: string
  exercises?: PlanExercise[]
  restDay?: boolean
  notes?: string
}

export interface WorkoutPlan {
  id: string
  userId: string
  name: string
  goal?: string
  fitnessLevel?: string
  equipment: string[]
  daysPerWeek: number
  isActive: boolean
  generatedByAI: boolean
  createdAt: string
  updatedAt: string
  days: PlanDay[]
}

export interface GeneratePlanInput {
  goal: 'lose' | 'maintain' | 'gain'
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek: number
  equipment: string[]
  focus?: string
}

export const workoutPlanService = {
  list: () => api.get<WorkoutPlan[]>('/fitness/plans'),
  getActive: () => api.get<WorkoutPlan | null>('/fitness/plans/active'),
  create: (plan: Partial<WorkoutPlan>) => api.post<WorkoutPlan>('/fitness/plans', plan),
  update: (id: string, plan: Partial<WorkoutPlan>) =>
    api.put<WorkoutPlan>(`/fitness/plans/${id}`, plan),
  remove: (id: string) => api.delete<{ message: string }>(`/fitness/plans/${id}`),
  generate: (input: GeneratePlanInput) =>
    api.post<Omit<WorkoutPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isActive' | 'generatedByAI'>>(
      '/fitness/plans/generate',
      input,
    ),
  updateDay: (planId: string, dayId: string, day: Partial<PlanDay>) =>
    api.put<PlanDay>(`/fitness/plans/${planId}/days/${dayId}`, day),
  applyDay: (planId: string, dayId: string, date: string) =>
    api.post<{ id: string }>(`/fitness/plans/${planId}/apply/${dayId}`, { date }),
}