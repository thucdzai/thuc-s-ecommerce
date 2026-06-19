import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      // Dev: proxy /api/* sang đúng backend service đang chạy ở cổng host (xem docker-compose.yml)
      '/api/auth': 'http://localhost:3002',
      '/api/users': 'http://localhost:3002',
      '/api/admin/users': 'http://localhost:3002',
      '/api/categories': 'http://localhost:3003',
      '/api/products': 'http://localhost:3003',
      '/api/admin/products': 'http://localhost:3003',
      '/api/uploads': 'http://localhost:3003',
      '/api/inventory': 'http://localhost:3004',
      '/api/admin/inventory': 'http://localhost:3004',
      '/api/cart': 'http://localhost:3005',
      '/api/orders': 'http://localhost:3006',
      '/api/admin/orders': 'http://localhost:3006',
      '/api/promotions': 'http://localhost:3006',
      '/api/admin/promotions': 'http://localhost:3006',
      '/api/payments': 'http://localhost:3007',
      '/api/admin/payments': 'http://localhost:3007',
      '/api/shipping': 'http://localhost:3008',
      '/api/admin/shipments': 'http://localhost:3008',
    },
  },
})
