import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'taskflow-pro-token';
export const PROJECT_STORAGE_KEY = 'taskflow-pro-project-id';
export const WORKSPACE_STORAGE_KEY = 'taskflow-pro-workspace-id';
export const RECENT_PROJECTS_KEY = 'taskflow-pro-recent-projects';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const reqUrl = error.config?.url || '';
    if (status === 401 && !reqUrl.includes('/auth/login') && !reqUrl.includes('/auth/register')) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('taskflow:unauthorized'));
    }

    const details = error.response?.data?.error?.details;
    const detailText =
      Array.isArray(details) && details.length > 0
        ? details.map((d) => d.message).join(', ')
        : null;

    const normalizedMessage =
      detailText ||
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Unable to reach TaskFlow Pro API';

    const err = new Error(normalizedMessage);
    err.status = status;
    return Promise.reject(err);
  }
);
