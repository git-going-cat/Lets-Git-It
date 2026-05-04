import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser } from '../types/auth.types';

interface AuthState {
  /** AccessToken — 메모리 전용 (새로고침 시 reissue 로 복구) */
  accessToken: string | null;
  /** 사용자 프로필 — localStorage 에 유지 */
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (accessToken, user) => set({ accessToken, user, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-store',
      // accessToken 은 persist 에서 제외 — XSS 방지 + reissue 로 복구
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
