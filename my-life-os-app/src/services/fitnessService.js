import { useAuthStore } from '../stores/authStore';

const BASE_URL = 'https://my-life-os-diary.onrender.com/api/v1';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
});

export const fitnessAPI = {
  getWorkouts: async (date, status) => {
    let url = `${BASE_URL}/fitness/workouts?`;
    if (date) url += `date=${date}&`;
    if (status) url += `status=${status}`;
    const res = await fetch(url, { headers: getHeaders() });
    return res.json();
  },
  createWorkout: async (data) => {
    const res = await fetch(`${BASE_URL}/fitness/workouts`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  updateWorkout: async (id, data) => {
    const res = await fetch(`${BASE_URL}/fitness/workouts/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteWorkout: async (id) => {
    const res = await fetch(`${BASE_URL}/fitness/workouts/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return res.json();
  },
  addExercises: async (workoutId, exercises) => {
    const res = await fetch(`${BASE_URL}/fitness/workouts/${workoutId}/exercises`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ exercises }),
    });
    return res.json();
  },
  getNutrition: async (date) => {
    const res = await fetch(`${BASE_URL}/fitness/nutrition?date=${date}`, { headers: getHeaders() });
    return res.json();
  },
  analyzeFoodImage: async (file) => {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      type: file.mimeType || 'image/jpeg',
      name: file.fileName || `food-${Date.now()}.jpg`,
    });
    const res = await fetch(`${BASE_URL}/fitness/nutrition/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
      body: form,
    });
    return res.json();
  },
  logFood: async (data) => {
    const res = await fetch(`${BASE_URL}/fitness/nutrition`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteFood: async (id) => {
    const res = await fetch(`${BASE_URL}/fitness/nutrition/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return res.json();
  },
  getDailySummary: async (date) => {
    const res = await fetch(`${BASE_URL}/fitness/summary?date=${date}`, { headers: getHeaders() });
    return res.json();
  },
  getGoals: async () => {
    const res = await fetch(`${BASE_URL}/fitness/goals`, { headers: getHeaders() });
    return res.json();
  },
  upsertGoals: async (data) => {
    const res = await fetch(`${BASE_URL}/fitness/goals`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  getReport: async (days = 30) => {
    const res = await fetch(`${BASE_URL}/fitness/report?days=${days}`, { headers: getHeaders() });
    return res.json();
  },
};
