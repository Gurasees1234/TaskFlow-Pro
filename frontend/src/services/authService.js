import { apiClient } from './apiClient';

export const authService = {
  async register(payload) {
    const { data } = await apiClient.post('/auth/register', payload);
    return data;
  },
  async login(payload) {
    const { data } = await apiClient.post('/auth/login', payload);
    return data;
  },
  async logout() {
    const { data } = await apiClient.post('/auth/logout');
    return data;
  },
  async getProfile() {
    const { data } = await apiClient.get('/auth/profile');
    return data.user || data;
  },
  async updateProfile(payload) {
    const { data } = await apiClient.put('/auth/profile', payload);
    return data.user || data;
  },
  async changePassword(payload) {
    const { data } = await apiClient.put('/auth/change-password', payload);
    return data;
  },
};

