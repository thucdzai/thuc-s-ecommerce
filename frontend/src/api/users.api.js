import { apiClient, unwrap, unwrapPage } from './client';

export const usersApi = {
  getProfile: () => apiClient.get('/users/profile').then(unwrap),
  updateProfile: (payload) => apiClient.put('/users/profile', payload).then(unwrap),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return apiClient.post('/users/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap);
  },

  getAddresses: (userId) => apiClient.get(`/users/${userId}/addresses`).then(unwrap),
  createAddress: (userId, payload) => apiClient.post(`/users/${userId}/addresses`, payload).then(unwrap),
  updateAddress: (userId, addressId, payload) =>
    apiClient.put(`/users/${userId}/addresses/${addressId}`, payload).then(unwrap),
  deleteAddress: (userId, addressId) =>
    apiClient.delete(`/users/${userId}/addresses/${addressId}`).then(unwrap),
  setDefaultAddress: (userId, addressId) =>
    apiClient.patch(`/users/${userId}/addresses/${addressId}/default`).then(unwrap),

  // Admin
  adminList: (params) => apiClient.get('/admin/users', { params }).then(unwrapPage),
  adminBan: (id) => apiClient.patch(`/admin/users/${id}/ban`).then(unwrap),
  adminUnban: (id) => apiClient.patch(`/admin/users/${id}/unban`).then(unwrap),
};
