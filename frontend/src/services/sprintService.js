import { apiClient } from './apiClient';

export const sprintService = {
  async listByProject(projectId, params = {}) {
    const { data } = await apiClient.get(`/sprints/project/${projectId}`, { params });
    return data.sprints || [];
  },
  async getById(id) {
    const { data } = await apiClient.get(`/sprints/${id}`);
    return data.sprint || data;
  },
  async create(payload) {
    const { data } = await apiClient.post('/sprints', payload);
    return data.sprint || data;
  },
  async update(id, payload) {
    const { data } = await apiClient.put(`/sprints/${id}`, payload);
    return data.sprint || data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/sprints/${id}`);
    return data;
  },
  async start(id) {
    const { data } = await apiClient.post(`/sprints/${id}/start`);
    return data.sprint || data;
  },
  async complete(id, payload = {}) {
    const { data } = await apiClient.post(`/sprints/${id}/complete`, payload);
    return data;
  },
  async addIssue(sprintId, issueId) {
    const { data } = await apiClient.post(`/sprints/${sprintId}/issues`, { issueId });
    return data;
  },
  async removeIssue(sprintId, issueId) {
    const { data } = await apiClient.delete(`/sprints/${sprintId}/issues/${issueId}`);
    return data;
  },
};
