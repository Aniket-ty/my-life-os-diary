import { useAuthStore } from '../stores/authStore';

const BASE_URL = 'http://localhost:3000/api/v1';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
});

export const bodyScanAPI = {
  getScans: async () => {
    const res = await fetch(`${BASE_URL}/body-scans`, { headers: getHeaders() });
    return res.json();
  },
  createScan: async (data) => {
    const res = await fetch(`${BASE_URL}/body-scans`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteScan: async (id) => {
    const res = await fetch(`${BASE_URL}/body-scans/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return res.json();
  },
};
