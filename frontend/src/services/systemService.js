import { apiClient } from './apiClient';

export const fetchHealthStatus = async () => {
  const { data } = await apiClient.get('/health');
  return data;
};

