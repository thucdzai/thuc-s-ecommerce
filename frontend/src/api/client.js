import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

// Một axios instance dùng chung cho toàn bộ app. Mọi request đều đi qua prefix /api —
// trong dev được Vite proxy, trong production được Nginx reverse-proxy tới đúng backend
// service tương ứng (xem vite.config.js và docker/nginx.conf). Nhờ vậy FE chỉ cần biết
// một base URL duy nhất, không quan tâm service nào đứng sau từng route.
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Hàng đợi các request bị 401 trong lúc đang refresh token, để không gọi refresh nhiều lần song song
let isRefreshing = false;
let pendingQueue = [];

function resolveQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (!response || response.status !== 401 || config._retry || config.url?.includes('/auth/refresh-token')) {
      return Promise.reject(error);
    }

    const { refreshToken, setSession, clearSession } = useAuthStore.getState();
    if (!refreshToken) {
      clearSession();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        config._retry = true;
        config.headers.Authorization = `Bearer ${token}`;
        return apiClient(config);
      });
    }

    config._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post('/api/auth/refresh-token', { refreshToken });
      const newAccessToken = data.accessToken ?? data.data?.accessToken;
      const newRefreshToken = data.refreshToken ?? data.data?.refreshToken ?? refreshToken;

      setSession({ accessToken: newAccessToken, refreshToken: newRefreshToken });
      resolveQueue(null, newAccessToken);

      config.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(config);
    } catch (refreshError) {
      resolveQueue(refreshError, null);
      clearSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Helper để rút gọn `response.data.data ?? response.data` — BE thường bọc payload trong { data }
export function unwrap(response) {
  return response.data?.data ?? response.data;
}

// Dùng cho các API danh sách có phân trang: BE trả `{ data: [...], pagination: { page, limit, totalItems, totalPages } }`.
// Giữ nguyên `pagination` do BE tính sẵn — FE chỉ render, không tự suy ra số trang/tổng số.
export function unwrapPage(response) {
  const body = response.data ?? {};
  return { items: body.data ?? [], pagination: body.pagination ?? null };
}
