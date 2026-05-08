import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser } from '../types/auth.types';

interface AuthState {
  /** AccessToken — 메모리 전용 (새로고침 시 reissue 로 복구) */
  accessToken: string | null;
  /** 사용자 프로필 — localStorage 에 유지 */
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** 탈퇴 후 계정 복구 알림 표시 여부 — 확인 후 clearReactivated로 해제 */
  pendingReactivationNotice: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  /** 온보딩 중 닉네임/onboardingStatus 등 부분 업데이트 */
  updateUser: (partial: Partial<AuthUser>) => void;
  setReactivated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      pendingReactivationNotice: false,
      setAuth: (accessToken, user) => set({ accessToken, user, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () =>
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          pendingReactivationNotice: false,
        }),
      updateUser: (partial) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...partial } });
      },
      setReactivated: (value) => set({ pendingReactivationNotice: value }),
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

export function waitForAuthStoreHydration() {
  if (useAuthStore.persist.hasHydrated()) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
