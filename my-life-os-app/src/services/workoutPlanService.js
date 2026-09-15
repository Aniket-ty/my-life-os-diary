import { useAuthStore } from '../stores/authStore';

const BASE_URL = 'https://my-life-os-diary.onrender.com/api/v1';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
});

const handle = async (res) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error
      ? (Array.isArray(data.error)
          ? data.error.map((e) => e.message).join(', ')
          : typeof data.error === 'string' ? data.error : 'Request failed')
      : 'Request failed';
    throw new Error(msg);
  }
  return data;
};

export const workoutPlanAPI = {
  getPlans: async () => handle(await fetch(`${BASE_URL}/fitness/plans`, { headers: getHeaders() })),
  getActive: async () => handle(await fetch(`${BASE_URL}/fitness/plans/active`, { headers: getHeaders() })),
  createPlan: async (data) => handle(await fetch(`${BASE_URL}/fitness/plans`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
  })),
  generate: async (input) => handle(await fetch(`${BASE_URL}/fitness/plans/generate`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(input),
  })),
  updatePlan: async (id, data) => handle(await fetch(`${BASE_URL}/fitness/plans/${id}`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
  })),
  deletePlan: async (id) => handle(await fetch(`${BASE_URL}/fitness/plans/${id}`, {
    method: 'DELETE', headers: getHeaders(),
  })),
  updateDay: async (planId, dayId, data) => handle(await fetch(`${BASE_URL}/fitness/plans/${planId}/days/${dayId}`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
  })),
  applyDay: async (planId, dayId, date) => handle(await fetch(`${BASE_URL}/fitness/plans/${planId}/apply/${dayId}`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({ date }),
  })),
};