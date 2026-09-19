import { api, API_BASE, getAccessToken, ApiError } from '@/lib/api';

export interface ExerciseSummary {
  id: string;
  name: string;
  primaryMuscle: string;
  difficultyLevel: string;
  shortDescription?: string;
  recommendedSets?: number;
  recommendedReps?: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
}

export interface ExerciseDetail extends ExerciseSummary {
  equipmentId?: string | null;
  equipment?: EquipmentSummary | null;
  category: string;
  secondaryMuscles: string[];
  instructions: string[];
  startingPosition: string;
  executionTechnique: string;
  breathingInstructions: string;
  commonMistakes: string[];
  safetyTips: string[];
  recommendedRestSec: number;
  gifUrl?: string | null;
  images: string[];
  tags: string[];
  alternatives: string[];
  alternativeExercises?: ExerciseSummary[];
  isActive: boolean;
}

export interface EquipmentSummary {
  id: string;
  name: string;
  category: string;
  imageUrl?: string | null;
  confidence?: number;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  exerciseCount?: number;
}

export interface EquipmentDetail extends EquipmentSummary {
  aliases: string[];
  description: string;
  instructions: string[];
  setupInstructions: string[];
  safetyInstructions: string[];
  commonMistakes: string[];
  exercises: ExerciseSummary[];
}

export interface ScanEquipmentSuccessResponse {
  equipment: EquipmentSummary;
  description: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  howToUse: string[];
  setupInstructions?: string[];
  safetyTips: string[];
  commonMistakes: string[];
  exercises: ExerciseSummary[];
  reasoning?: string;
  isCached?: boolean;
}

export interface ScanEquipmentUncertainResponse {
  isUncertain: true;
  confidence: number;
  detectedName?: string;
  message: string;
  reasoning: string;
  tips: string[];
  suggestions: EquipmentSummary[];
}

export interface ScanEquipmentMultipleResponse {
  detectedMultiple: true;
  message: string;
  candidates: EquipmentSummary[];
}

export type ScanEquipmentResponse =
  | ScanEquipmentSuccessResponse
  | ScanEquipmentUncertainResponse
  | ScanEquipmentMultipleResponse;

export const equipmentService = {
  /**
   * Scans gym machine photo via AI vision.
   */
  scanEquipment: async (file: File | Blob, provider?: string): Promise<ScanEquipmentResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const url = `${API_BASE}/fitness/equipment/scan${provider ? `?provider=${encodeURIComponent(provider)}` : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: formData,
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new ApiError(data.error || 'Failed to identify gym machine.', res.status);
      }
      return data as ScanEquipmentResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * List or search equipment.
   */
  listEquipment: (params?: { q?: string; category?: string; muscle?: string }) =>
    api.get<EquipmentDetail[]>('/fitness/equipment', params as Record<string, unknown>),

  /**
   * Get single equipment detail.
   */
  getEquipmentById: (id: string) =>
    api.get<EquipmentDetail>(`/fitness/equipment/${id}`),

  /**
   * Get exercises for a machine.
   */
  getEquipmentExercises: (id: string) =>
    api.get<ExerciseSummary[]>(`/fitness/equipment/${id}/exercises`),

  /**
   * List or search exercises.
   */
  listExercises: (params?: { q?: string; muscle?: string; equipmentId?: string; difficulty?: string; category?: string }) =>
    api.get<ExerciseDetail[]>('/fitness/exercises', params as Record<string, unknown>),

  /**
   * Get single exercise full details for demo.
   */
  getExerciseById: (id: string) =>
    api.get<ExerciseDetail>(`/fitness/exercises/${id}`),

  /**
   * Add exercise to today's workout or specific workout.
   */
  addExerciseToWorkout: (
    exerciseId: string,
    data: {
      workoutId?: string;
      workoutDate?: string;
      sets?: number;
      reps?: string;
      weightKg?: number;
    }
  ) =>
    api.post<{ message: string; workoutId: string; exercise: any }>(
      `/fitness/exercises/${exerciseId}/add-to-workout`,
      data
    ),

  /**
   * Admin operations.
   */
  createEquipment: (data: Partial<EquipmentDetail>) =>
    api.post<EquipmentDetail>('/fitness/admin/equipment', data),

  updateEquipment: (id: string, data: Partial<EquipmentDetail>) =>
    api.put<EquipmentDetail>(`/fitness/admin/equipment/${id}`, data),

  deleteEquipment: (id: string) =>
    api.delete<{ message: string }>(`/fitness/admin/equipment/${id}`),

  createExercise: (data: Partial<ExerciseDetail>) =>
    api.post<ExerciseDetail>('/fitness/admin/exercises', data),

  updateExercise: (id: string, data: Partial<ExerciseDetail>) =>
    api.put<ExerciseDetail>(`/fitness/admin/exercises/${id}`, data),

  deleteExercise: (id: string) =>
    api.delete<{ message: string }>(`/fitness/admin/exercises/${id}`),

  /**
   * Track analytics event.
   */
  trackEvent: (eventName: string, properties?: Record<string, unknown>) =>
    api.post('/fitness/analytics/event', { eventName, properties }).catch(() => {
      // Non-blocking analytics
    }),
};
