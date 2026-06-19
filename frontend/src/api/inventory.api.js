import { apiClient, unwrap, unwrapPage } from './client';

export const inventoryApi = {
  getBySku: (skuId) => apiClient.get(`/inventory/${skuId}`).then(unwrap),

  // Admin
  logs: (params) => apiClient.get('/inventory/logs', { params }).then(unwrapPage),
  adjust: (skuId, payload) => apiClient.put(`/admin/inventory/${skuId}/adjust`, payload).then(unwrap),
};
