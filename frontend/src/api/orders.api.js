import { apiClient, unwrap, unwrapPage } from './client';

export const ordersApi = {
  checkout: (payload) => apiClient.post('/orders/checkout', payload).then(unwrap),
  myOrders: (params) => apiClient.get('/orders/me', { params }).then(unwrapPage),
  myOrderDetail: (id) => apiClient.get(`/orders/me/${id}`).then(unwrap),

  // Admin
  adminList: (params) => apiClient.get('/admin/orders', { params }).then(unwrapPage),
  adminDetail: (id) => apiClient.get(`/admin/orders/${id}`).then(unwrap),
  adminUpdateStatus: (id, payload) => apiClient.put(`/admin/orders/${id}/status`, payload).then(unwrap),
};

export const promotionsApi = {
  preview: (payload) => apiClient.post('/promotions/preview', payload).then(unwrap),

  // Admin
  adminList: (params) => apiClient.get('/admin/promotions', { params }).then(unwrapPage),
  adminCreate: (payload) => apiClient.post('/admin/promotions', payload).then(unwrap),
  adminDetail: (id) => apiClient.get(`/admin/promotions/${id}`).then(unwrap),
  adminUpdate: (id, payload) => apiClient.put(`/admin/promotions/${id}`, payload).then(unwrap),
};
