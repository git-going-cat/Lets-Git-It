import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { analytics } from '@/lib/analytics';

import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

import type { AuthUser, LoginRequest, LoginResponseData } from '../types/auth.types';

function toAuthUser(data: LoginResponseData): AuthUser {
  return {
    memberId: data.memberId,
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
  const { setAuth, clearAuth, setReactivated, user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleLoginResponse = useCallback(
    async (res: LoginResponseData & { isFirstLogin: boolean; isReactivated: boolean }) => {
      setAuth(res.accessToken, toAuthUser(res));
      analytics.identifyUser(res.memberId);
      if (res.isReactivated) {
        setReactivated(true);
      }
      // 온보딩 미완료(NONE, NICKNAME_SET_DONE)이면 중간 재진입 포함 온보딩 라우트로 이동
      if (res.onboardingStatus !== 'TUTORIAL_DONE') {
        await navigate({ to: '/onboarding' });
      } else {
        await navigate({ to: '/' });
      }
    },
    [setAuth, setReactivated, navigate]
  );

  const login = useCallback(
    async (body: LoginRequest) => {
      const { data } = await authApi.login(body);
      await handleLoginResponse(data.data);
    },
    [handleLoginResponse]
  );

  const loginWithOAuth = useCallback(
    async (code: string) => {
      const { data } = await authApi.exchangeOAuthCode({ code });
      await handleLoginResponse(data.data);
    },
    [handleLoginResponse]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      analytics.resetUser();
      clearAuth();
      await navigate({ to: '/login' });
    }
  }, [clearAuth, navigate]);

  return { login, loginWithOAuth, logout, user, isAuthenticated };
}
