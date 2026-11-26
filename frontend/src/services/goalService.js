import { apiClient } from './apiClient';

export const goalService = {
  async list(params) {
    const { data } = await apiClient.get('/goals', { params });
    return data.goals || [];
  },
  async create(payload) {
    const { data } = await apiClient.post('/goals', payload);
    return data.goal || data;
  },
  async toggle(id) {
    const { data } = await apiClient.patch(`/goals/${id}/toggle`);
    return data.goal || data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/goals/${id}`);
    return data;
  },
};
