import { apiClient } from './apiClient';

export const commentService = {
  async list(issueId) {
    const { data } = await apiClient.get(`/comments/issue/${issueId}`);
    return data.comments || [];
  },
  async add(issueId, body) {
    const { data } = await apiClient.post(`/comments/issue/${issueId}`, { body });
    return data.comment || data;
  },
  async update(id, body) {
    const { data } = await apiClient.put(`/comments/${id}`, { body });
    return data.comment || data;
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/comments/${id}`);
    return data;
  },
};

