import { api } from '@/lib/api'

export interface BodyScan {
  id: string
  scanDate: string
  weight: number
  bodyFatPct?: number | null
  muscleMassKg?: number | null
  leanBodyMassKg?: number | null
  bmr?: number | null
  tee?: number | null
  visceralFat?: number | null
  bwiScore?: number | null
  bioAge?: number | null
  proteinKg?: number | null
  notes?: string | null
  createdAt: string
}

export interface NewBodyScan {
  scanDate?: string
  weight: number
  bodyFatPct?: number
  muscleMassKg?: number
  leanBodyMassKg?: number
  bmr?: number
  tee?: number
  visceralFat?: number
  bwiScore?: number
  bioAge?: number
  proteinKg?: number
  notes?: string
}

export const bodyScanService = {
  list: () => api.get<BodyScan[]>('/body-scans'),
  create: (scan: NewBodyScan) => api.post<BodyScan>('/body-scans', scan),
  remove: (id: string) => api.delete<{ message: string }>(`/body-scans/${id}`),
}