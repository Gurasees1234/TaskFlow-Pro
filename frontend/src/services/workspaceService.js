import { apiClient } from './apiClient';

export const workspaceService = {
  async list() {
    const { data } = await apiClient.get('/workspaces');
    return data.workspaces || [];
  },
  async getById(id) {
    const { data } = await apiClient.get(`/workspaces/${id}`);
    return data.workspace || data;
  },
  async create(payload) {
    const { data } = await apiClient.post('/workspaces', payload);
    return data.workspace || data;
  },
  async update(id, payload) {
    const { data } = await apiClient.put(`/workspaces/${id}`, payload);
    return data.workspace || data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/workspaces/${id}`);
    return data;
  },
  async getMembers(id) {
    const { data } = await apiClient.get(`/workspaces/${id}/members`);
    return data.members || [];
  },
  async addMember(id, payload) {
    const { data } = await apiClient.post(`/workspaces/${id}/members`, payload);
    return data.workspace || data;
  },
  async updateMemberRole(id, userId, role) {
    const { data } = await apiClient.patch(`/workspaces/${id}/members/${userId}`, { role });
    return data.workspace || data;
  },
  async removeMember(id, userId) {
    const { data } = await apiClient.delete(`/workspaces/${id}/members/${userId}`);
    return data.workspace || data;
  },
};

