import { apiClient } from './apiClient';

export const analyticsService = {
  async getProject(projectId, params = {}) {
    const { data } = await apiClient.get(`/analytics/project/${projectId}`, { params });
    return data;
  },
};
