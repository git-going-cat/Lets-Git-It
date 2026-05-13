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
  const sessionId = useSingleStore((state) => state.sessionId);
  const sessionExpiresAt = useSingleStore((state) => state.sessionExpiresAt);

  useEffect(() => {
    // sessionId 없이 sessionExpiresAt만 남은 경우는 이전 진입의 stale 값.
    // setSession이 새 세션을 set하면 두 값이 함께 갱신되어 effect가 재발화한다.
    if (!sessionId || !sessionExpiresAt) return;

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
  }, [sessionId, sessionExpiresAt]);

  useEffect(() => {
    // pushState로 중복 히스토리 항목을 추가해 최초 브라우저 뒤로가기 시 popstate를 캐치한다.
    // popstate 발화 시 홈으로 replace 이동하면 중복 항목이 제거되어 이후 앞으로가기도 차단된다.
    // (sessionStorage GUARD_KEY 방식은 정상적인 메뉴 재진입도 차단하는 부작용이 있어 제거함)
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      navigate({ to: '/home', replace: true });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);
}
