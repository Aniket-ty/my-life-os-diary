import { api } from '@/lib/api'
import type { MealType } from '@/lib/utils'

export interface WorkoutExercise {
  id?: string
  exerciseName: string
  sets?: number | null
  reps?: number | null
  weightKg?: number | null
  durationSec?: number | null
  distanceKm?: number | null
  orderIndex?: number
}

export interface Workout {
  id: string
  name: string
  workoutDate: string
  status: 'planned' | 'completed'
  durationMin?: number | null
  notes?: string | null
  totalCaloriesBurned?: number | null
  createdAt: string
  updatedAt: string
  exercises: WorkoutExercise[]
}

export interface NutritionLog {
  id: string
  foodName: string
  mealType: MealType
  calories: number
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  quantity?: string | null
  logDate: string
  aiSuggested?: boolean
  createdAt: string
}

export interface FitnessGoals {
  dailyCalories?: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
}

export interface DailySummary {
  date: string
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number }
  goals: FitnessGoals | null
  remaining: { calories: number; proteinG: number } | null
  byMeal: Partial<Record<MealType, NutritionLog[]>>
  logCount: number
}

export interface ConsistencyReport {
  period: number
  workouts: {
    total: number
    completed: number
    uniqueDays: number
    consistencyPct: number
  }
  nutrition: {
    totalLogs: number
    uniqueDays: number
    loggingPct: number
  }
  todos: {
    total: number
    completed: number
    completionRate: number
  }
  dailyBreakdown: {
    date: string
    dayOfWeek: number
    hasWorkout: boolean
    hasNutrition: boolean
    plannedWorkout: { workoutName: string } | null
  }[]
  activePlan: { name: string; daysPerWeek: number } | null
}

export const fitnessService = {
  listWorkouts: (date?: string, status?: string) =>
    api.get<Workout[]>('/fitness/workouts', { date, status }),
  getWorkout: (id: string) => api.get<Workout>(`/fitness/workouts/${id}`),
  createWorkout: (data: Partial<Workout> & { exercises?: WorkoutExercise[] }) =>
    api.post<Workout>('/fitness/workouts', data),
  updateWorkout: (id: string, data: Partial<Workout>) =>
    api.put<Workout>(`/fitness/workouts/${id}`, data),
  deleteWorkout: (id: string) => api.delete<{ message: string }>(`/fitness/workouts/${id}`),

  getNutrition: (date?: string) => api.get<NutritionLog[]>('/fitness/nutrition', { date }),
  logFood: (data: Omit<NutritionLog, 'id' | 'createdAt'>) =>
    api.post<NutritionLog>('/fitness/nutrition', data),
  deleteFood: (id: string) => api.delete<{ message: string }>(`/fitness/nutrition/${id}`),

  getSummary: (date?: string) => api.get<DailySummary>('/fitness/summary', { date }),
  getGoals: () => api.get<FitnessGoals>('/fitness/goals'),
  updateGoals: (goals: FitnessGoals) => api.put<FitnessGoals>('/fitness/goals', goals),
  getReport: (days?: number) => api.get<ConsistencyReport>('/fitness/report', { days }),
}