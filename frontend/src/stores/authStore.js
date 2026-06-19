import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Lưu trữ phiên đăng nhập (user + token cặp access/refresh).
// Đây là nguồn sự thật duy nhất cho trạng thái xác thực phía client — mọi nơi khác
// (axios interceptor, route guard...) đều đọc/ghi qua store này.
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      isAuthenticated: () => !!get().accessToken,
      isAdmin: () => {
        const user = get().user;
        // API trả về roles (array), ví dụ: ["USER"] hoặc ["ADMIN"]
        return Array.isArray(user?.roles) && user.roles.includes('ADMIN');
      },

      setSession: ({ user, accessToken, refreshToken }) =>
        set((state) => ({
          user: user ?? state.user,
          accessToken: accessToken ?? state.accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        })),

      setUser: (user) => set({ user }),

      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'tttn-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
