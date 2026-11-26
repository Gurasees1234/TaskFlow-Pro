import { apiClient } from './apiClient';

export const backlogService = {
  async getByProject(projectId, params = {}) {
    const { data } = await apiClient.get(`/backlog/project/${projectId}`, { params });
    return data;
  },
  // Legacy workspace-scoped call — safely returns empty totals when no wsId is available
  async getByWorkspace(wsId, params = {}) {
    if (!wsId) return { total: 0, issues: [] };
    // Workspace backlog is not a supported endpoint; return empty gracefully
    return { total: 0, issues: [] };
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
