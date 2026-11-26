import { apiClient } from './apiClient';

export const analyticsService = {
  async getProject(projectId, params = {}) {
    const { data } = await apiClient.get(`/analytics/project/${projectId}`, { params });
    return data;
  },
  // Workspace-level analytics: not a supported backend endpoint.
  // Returns a safe empty structure so pages that call this do not crash.
  async getWorkspace(_wsId, _params = {}) {
    return {
      success: true,
      totalIssues: 0,
      completedIssues: 0,
      inProgressIssues: 0,
      todoIssues: 0,
      overdueIssues: 0,
      activeProjects: 0,
      totalMembers: 0,
      byStatus: [],
      byPriority: [],
      byType: [],
      recentActivity: [],
      sprintBurndown: { hasSufficientData: false, series: [] },
      teamWorkload: [],
    };
  },
};
