import { useEffect, useRef } from 'react';
import { useSearch } from '@tanstack/react-router';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * GET /auth/callback/google?code={임시코드}
 *
 * 백엔드가 Google OAuth 완료 후 리다이렉트하는 주소.
 * code 를 받아 즉시 토큰 교환 API(/api/v1/auth/token) 를 호출합니다.
 */
export default function GoogleCallbackPage() {
  const { loginWithOAuth } = useAuth();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { code, error } = useSearch({ strict: false }) as { code?: string; error?: string };
  const called = useRef(false);

  useEffect(() => {
    if (error) {
      // 백엔드 OAuth 처리 실패 → 기존 세션 초기화 후 로그인 페이지로 복귀
      clearAuth();
      window.location.href = '/login';
      return;
    }
    if (called.current || !code) return;
    called.current = true;
    loginWithOAuth(code).catch(() => {
      // 코드 만료·무효 → 로그인 페이지로 복귀
      window.location.href = '/login';
    });
  }, [code, error, loginWithOAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1b1a4b]">
      <div className="text-white/70 text-sm animate-pulse">로그인 처리 중...</div>
    </div>
  );
}
