import { apiClient, unwrap, unwrapPage } from './client';

export const productsApi = {
  // params: { page, limit, sort, categoryId, q, minPrice, maxPrice } — BE xử lý lọc/sắp/phân trang
  list: (params) => apiClient.get('/products', { params }).then(unwrapPage),
  getById: (id) => apiClient.get(`/products/${id}`).then(unwrap),

  // Admin
  // adminList: khác list() ở chỗ KHÔNG bị BE ép lọc status='active' — admin cần thấy cả sản
  // phẩm "Bản nháp"/"Ngừng bán" trong trang quản lý để còn chỉnh sửa/mở bán lại.
  // params: { page, limit, status, categoryId, q }
  adminList: (params) => apiClient.get('/admin/products', { params }).then(unwrapPage),
  create: (payload) => apiClient.post('/admin/products', payload).then(unwrap),
  update: (id, payload) => apiClient.put(`/admin/products/${id}`, payload).then(unwrap),
  remove: (id) => apiClient.delete(`/admin/products/${id}`).then(unwrap),
};

export const categoriesApi = {
  tree: () => apiClient.get('/categories').then(unwrap),
};
