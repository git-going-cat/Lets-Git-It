import { useEffect, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

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
  const navigate = useNavigate();
  const { code, error } = useSearch({ strict: false }) as { code?: string; error?: string };
  const called = useRef(false);

  useEffect(() => {
    if (error) {
      // 백엔드 OAuth 처리 실패 → 기존 세션 초기화 후 로그인 페이지로 복귀
      clearAuth();
      void navigate({ to: '/login' });
      return;
    }
    if (!code) {
      // code도 error도 없는 직접 URL 진입 → 로그인 페이지로 복귀 (무한 spinner 방지)
      // error 분기와 달리 clearAuth()를 호출하지 않는 것은 의도된 동작:
      // 단순 직접 진입은 기존 로그인 세션을 유지해야 하므로 세션 초기화 없이 이동.
      void navigate({ to: '/login' });
      return;
    }
    if (called.current) return;
    called.current = true;
    loginWithOAuth(code).catch(() => {
      // 코드 만료·무효 → 로그인 페이지로 복귀
      void navigate({ to: '/login' });
    });
  }, [code, error, loginWithOAuth, clearAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1b1a4b]">
      <div className="text-white/70 text-sm animate-pulse">로그인 처리 중...</div>
    </div>
  );
}
