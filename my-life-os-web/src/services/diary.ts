import { api } from '@/lib/api'

export interface MediaAttachment {
  id: string
  mediaType: 'photo' | 'audio' | 'video'
  cloudinaryUrl: string
  fileName?: string | null
  fileSizeKb?: number | null
  durationSec?: number | null
  createdAt: string
}

export interface DiaryEntry {
  id: string
  title?: string | null
  content: string
  mood?: string | null
  weather?: string | null
  entryDate: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  attachments: MediaAttachment[]
}

export interface DiaryListResponse {
  entries: DiaryEntry[]
  total: number
  page: number
  limit: number
}

export interface NewDiaryEntry {
  title?: string
  content: string
  mood?: string
  weather?: string
  entryDate?: string
  isPinned?: boolean
}

export const diaryService = {
  list: (date?: string, page = 1, limit = 100) =>
    api.get<DiaryListResponse>('/diary', { date, page, limit }),
  search: (q: string) => api.get<{ entries: DiaryEntry[]; total: number }>('/diary/search', { q }),
  get: (id: string) => api.get<DiaryEntry>(`/diary/${id}`),
  create: (entry: NewDiaryEntry) => api.post<DiaryEntry>('/diary', entry),
  update: (id: string, entry: Partial<NewDiaryEntry>) =>
    api.put<DiaryEntry>(`/diary/${id}`, entry),
  remove: (id: string) => api.delete<{ message: string }>(`/diary/${id}`),
  uploadMedia: (id: string, file: File, mediaType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('mediaType', mediaType)
    return api.upload<MediaAttachment>(`/diary/${id}/media`, form)
  },
  deleteMedia: (id: string, mediaId: string) =>
    api.delete<{ message: string }>(`/diary/${id}/media/${mediaId}`),
}