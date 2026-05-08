import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { EventBus } from '@/core/bridge/EventBus';

import { useSingleStore } from '../store/singleStore';

/**
 * 싱글 모드 페이지의 세션 타임아웃과 브라우저 히스토리 이탈을 방어하는 훅.
 * 백엔드 Redis 세션 TTL과 맞춰 세션 생성 후 30분 경과 시 게임 만료 이벤트를 발행합니다.
 * 뒤로가기/앞으로가기로 재진입하는 경우에는 /home으로 이동시킵니다.
 */
export function useSinglePageGuards() {
  const navigate = useNavigate();
  const sessionExpiresAt = useSingleStore((state) => state.sessionExpiresAt);

  useEffect(() => {
    if (!sessionExpiresAt) return;

    const expireSession = () => EventBus.emit('game:session-expired');
    const remainingMs = sessionExpiresAt - Date.now();

    if (remainingMs <= 0) {
      expireSession();
      return;
    }

    const timer = setTimeout(expireSession, remainingMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() >= sessionExpiresAt) {
        expireSession();
      }
    };
    const handleFocus = () => {
      if (Date.now() >= sessionExpiresAt) expireSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sessionExpiresAt]);

  useEffect(() => {
    const GUARD_KEY = 'single:historyGuard';

    if (sessionStorage.getItem(GUARD_KEY)) {
      sessionStorage.removeItem(GUARD_KEY);
      navigate({ to: '/home', replace: true });
      return;
    }

    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      sessionStorage.setItem(GUARD_KEY, 'true');
      navigate({ to: '/home', replace: true });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);
}
