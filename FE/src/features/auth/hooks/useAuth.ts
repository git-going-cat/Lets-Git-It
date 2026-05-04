import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

import type { AuthUser, LoginRequest, LoginResponseData } from '../types/auth.types';

function toAuthUser(data: LoginResponseData): AuthUser {
  return {
    nickname: data.nickname,
    onboardingStatus: data.onboardingStatus,
    characterHair: data.characterHair,
    characterHairColor: data.characterHairColor,
    characterBody: data.characterBody,
    characterEye: data.characterEye,
    characterOutfit: data.characterOutfit,
    characterOutfitColor: data.characterOutfitColor,
  };
}

/**
 * 인증 관련 액션을 제공하는 커스텀 훅.
 *
 * - `login`: 이메일/비밀번호 로그인
 * - `loginWithOAuth`: Google OAuth 임시코드 → 토큰 교환 후 로그인
 * - `logout`: 서버 로그아웃 후 로컬 상태 초기화
 * - `user`: 현재 로그인된 사용자 정보 (AuthUser | null)
 * - `isAuthenticated`: 로그인 여부
 */
export function useAuth() {
  const { setAuth, clearAuth, user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(
    async (body: LoginRequest) => {
      const { data } = await authApi.login(body);
      const res = data.data;
      setAuth(res.accessToken, toAuthUser(res));
      // TODO: /onboarding 라우트 등록 후 as never 제거
      await navigate({ to: res.isFirstLogin ? ('/onboarding' as never) : '/' });
    },
    [setAuth, navigate]
  );

  const loginWithOAuth = useCallback(
    async (code: string) => {
      const { data } = await authApi.exchangeOAuthCode({ code });
      const res = data.data;
      setAuth(res.accessToken, toAuthUser(res));
      // TODO: /onboarding 라우트 등록 후 as never 제거
      await navigate({ to: res.isFirstLogin ? ('/onboarding' as never) : '/' });
    },
    [setAuth, navigate]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      await navigate({ to: '/login' });
    }
  }, [clearAuth, navigate]);

  return { login, loginWithOAuth, logout, user, isAuthenticated };
}
