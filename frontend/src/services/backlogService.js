import { apiClient } from './apiClient';

export const backlogService = {
  async getByProject(projectId, params = {}) {
    const { data } = await apiClient.get(`/backlog/project/${projectId}`, { params });
    return data;
  },
  async moveToSprint(issueId, sprintId) {
    const { data } = await apiClient.post('/backlog/move', { issueId, sprintId });
    return data;
  },
  async reorder(projectId, orderedIds) {
    const { data } = await apiClient.patch(`/backlog/reorder/${projectId}`, { orderedIds });
    return data;
  },
};
