import { apiClient } from './apiClient';

export const activityService = {
  async listByProject(projectId, params = {}) {
    const { data } = await apiClient.get(`/activity/project/${projectId}`, { params });
    return data;
  },
};
