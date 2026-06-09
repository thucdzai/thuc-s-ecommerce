import { apiClient, unwrap } from './client';

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload).then(unwrap),
  login: (payload) => apiClient.post('/auth/login', payload).then(unwrap),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refreshToken }).then(unwrap),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh-token', { refreshToken }).then(unwrap),
};
