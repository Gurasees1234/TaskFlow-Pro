import { apiClient } from './apiClient';

export const projectService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/projects', { params });
    return data.projects || [];
  },
  async getById(id) {
    const { data } = await apiClient.get(`/projects/${id}`);
    return data.project || data;
  },
  async create(payload) {
    const { data } = await apiClient.post('/projects', payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await apiClient.put(`/projects/${id}`, payload);
    return data.project || data;
  },
  async transferLeadership(id, newLeadUserId) {
    const { data } = await apiClient.post(`/projects/${id}/transfer-lead`, { newLeadUserId });
    return data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/projects/${id}`);
    return data;
  },
  async getMembers(id) {
    const { data } = await apiClient.get(`/projects/${id}/members`);
    return data.members || [];
  },
  async updateMemberRole(id, userId, role) {
    const { data } = await apiClient.patch(`/projects/${id}/members/${userId}`, { role });
    return data;
  },
  async removeMember(id, userId) {
    const { data } = await apiClient.delete(`/projects/${id}/members/${userId}`);
    return data;
  },
  async getStats(id) {
    const { data } = await apiClient.get(`/projects/stats/${id}`);
    return data;
  },
};
