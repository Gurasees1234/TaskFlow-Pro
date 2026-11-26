import { apiClient } from './apiClient';

export const invitationService = {
  async getEmailStatus() {
    const { data } = await apiClient.get('/invitations/email-status');
    return data;
  },
  async sendInvites(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/invitations`, payload);
    return data;
  },
  async listByProject(projectId) {
    const { data } = await apiClient.get(`/projects/${projectId}/invitations`);
    return data.invitations || [];
  },
  async resend(projectId, invitationId) {
    const { data } = await apiClient.post(`/projects/${projectId}/invitations/${invitationId}/resend`);
    return data;
  },
  async revoke(projectId, invitationId) {
    const { data } = await apiClient.post(`/projects/${projectId}/invitations/${invitationId}/revoke`);
    return data;
  },
  async verifyToken(token) {
    const { data } = await apiClient.get(`/invitations/verify/${token}`);
    return data;
  },
  async acceptByToken(token) {
    const { data } = await apiClient.post('/invitations/accept', { token });
    return data;
  },
  async acceptById(invitationId) {
    const { data } = await apiClient.post(`/invitations/${invitationId}/accept`);
    return data;
  },
  async listMine() {
    const { data } = await apiClient.get('/invitations/my');
    return data.invitations || [];
  },
};
