import { api } from '../config/api';

export const diaryAPI = {
  getEntries: async () => {
    const { data } = await api.get('/diary');
    return data;
  },

  getEntry: async (id) => {
    const { data } = await api.get(`/diary/${id}`);
    return data;
  },

  createEntry: async (entryData) => {
    const { data } = await api.post('/diary', entryData);
    return data;
  },

  updateEntry: async (id, entryData) => {
    const { data } = await api.put(`/diary/${id}`, entryData);
    return data;
  },

  deleteEntry: async (id) => {
    await api.delete(`/diary/${id}`);
  },

  uploadMedia: async (entryId, fileUri, mediaType, fileName) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: mediaType === 'photo' ? 'image/jpeg' : mediaType === 'video' ? 'video/mp4' : 'audio/m4a',
      name: fileName,
    });
    formData.append('mediaType', mediaType);

    const { data } = await api.post(`/diary/${entryId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
