import { apiClient } from './apiClient';

export const notificationService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/notifications', { params });
    return data;
  },
  async getUnreadCount(projectId) {
    const { data } = await apiClient.get('/notifications/unread-count', {
      params: projectId ? { projectId } : {},
    });
    return data.unreadCount || 0;
  },
  async markRead(id) {
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data.notification || data;
  },
  async markAllRead(projectId) {
    const { data } = await apiClient.patch('/notifications/mark-all-read', projectId ? { projectId } : {});
    return data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/notifications/${id}`);
    return data;
  },
};
