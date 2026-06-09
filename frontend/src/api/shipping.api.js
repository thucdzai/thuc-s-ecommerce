import { apiClient, unwrap, unwrapPage } from './client';

export const shippingApi = {
  calculateFee: (payload) => apiClient.post('/shipping/calculate-fee', payload).then(unwrap),
  myShipments: (params) => apiClient.get('/shipping/me', { params }).then(unwrapPage),
  myShipmentDetail: (orderCode) => apiClient.get(`/shipping/me/${orderCode}`).then(unwrap),

  // Admin
  adminList: (params) => apiClient.get('/admin/shipments', { params }).then(unwrapPage),
  adminDetail: (id) => apiClient.get(`/admin/shipments/${id}`).then(unwrap),
  adminUpdateStatus: (id, payload) => apiClient.put(`/admin/shipments/${id}/status`, payload).then(unwrap),
};
