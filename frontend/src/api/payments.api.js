import { apiClient, unwrap, unwrapPage } from './client';

export const paymentsApi = {
  createVnpayUrl: (payload) => apiClient.post('/payments/vnpay/create-url', payload).then(unwrap),
  myPayments: (params) => apiClient.get('/payments/me', { params }).then(unwrapPage),
  myPaymentDetail: (orderCode) => apiClient.get(`/payments/me/${orderCode}`).then(unwrap),

  // Admin
  adminList: (params) => apiClient.get('/admin/payments', { params }).then(unwrapPage),
  adminDetail: (id) => apiClient.get(`/admin/payments/${id}`).then(unwrap),
};
