import { apiClient, unwrap } from './client';

export const cartApi = {
  get: () => apiClient.get('/cart').then(unwrap),
  clear: () => apiClient.delete('/cart').then(unwrap),
  addItem: (payload) => apiClient.post('/cart/items', payload).then(unwrap),
  updateItem: (skuId, payload) => apiClient.patch(`/cart/items/${skuId}`, payload).then(unwrap),
  removeItem: (skuId) => apiClient.delete(`/cart/items/${skuId}`).then(unwrap),
};
