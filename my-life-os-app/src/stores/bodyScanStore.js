import { create } from 'zustand';
import { bodyScanAPI } from '../services/bodyScanService';

export const useBodyScanStore = create((set) => ({
  scans: [],
  loading: false,

  fetchScans: async () => {
    set({ loading: true });
    try {
      const data = await bodyScanAPI.getScans();
      set({ scans: Array.isArray(data) ? data : [], loading: false });
    } catch (e) {
      set({ loading: false });
    }
  },

  createScan: async (data) => {
    const scan = await bodyScanAPI.createScan(data);
    set((s) => ({ scans: [scan, ...s.scans] }));
    return scan;
  },

  deleteScan: async (id) => {
    await bodyScanAPI.deleteScan(id);
    set((s) => ({ scans: s.scans.filter((sc) => sc.id !== id) }));
  },
}));
