import { apiClient } from './apiClient';

export const documentService = {
  async list(params) {
    const { data } = await apiClient.get('/documents', { params });
    return data.documents || [];
  },
  async create(payload) {
    const { data } = await apiClient.post('/documents', payload);
    return data.document || data;
  },
  async update(id, payload) {
    const { data } = await apiClient.put(`/documents/${id}`, payload);
    return data.document || data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/documents/${id}`);
    return data;
  },
};
