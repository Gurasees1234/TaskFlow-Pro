import { apiClient } from './apiClient';

export const attachmentService = {
  async listByProject(projectId, params = {}) {
    const { data } = await apiClient.get(`/attachments/project/${projectId}`, { params });
    return data.attachments || [];
  },
  async upload(projectId, formData) {
    const { data } = await apiClient.post(`/attachments/project/${projectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.attachment;
  },
  async download(attachmentId, fileName) {
    const response = await apiClient.get(`/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'attachment');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  async remove(id) {
    const { data } = await apiClient.delete(`/attachments/${id}`);
    return data;
  },
};
