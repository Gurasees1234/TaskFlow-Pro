import { apiClient } from './apiClient';

export const issueService = {
  async listMy(params = {}) {
    const { data } = await apiClient.get('/issues/my', { params });
    return data.issues || [];
  },
  async listByProject(projectId, params = {}) {
    const { data } = await apiClient.get(`/issues/project/${projectId}`, { params });
    return data;
  },
  async getById(id) {
    const { data } = await apiClient.get(`/issues/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await apiClient.post('/issues', payload);
    return data.issue || data;
  },
  async update(id, payload) {
    const { data } = await apiClient.put(`/issues/${id}`, payload);
    return data.issue || data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/issues/${id}`);
    return data;
  },
  async assign(id, assigneeId) {
    const { data } = await apiClient.post(`/issues/${id}/assign`, { assigneeId });
    return data.issue || data;
  },
  async changeStatus(id, status) {
    const { data } = await apiClient.patch(`/issues/${id}/status`, { status });
    return data.issue || data;
  },
  async changePriority(id, priority) {
    const { data } = await apiClient.patch(`/issues/${id}/priority`, { priority });
    return data.issue || data;
  },
  async search(params) {
    const { data } = await apiClient.get('/issues/search', { params });
    return data.issues || [];
  },
};
