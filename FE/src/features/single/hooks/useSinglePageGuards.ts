import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

/**
 * 싱글 모드 페이지의 세션 타임아웃과 브라우저 히스토리 이탈을 방어하는 훅.
 * 30분 경과 시 /home으로 리다이렉트하고, 뒤로가기/앞으로가기로 재진입을 차단합니다.
 * TODO: API 연동 후 세션 생성 시각을 받아 남은 시간만큼 타이머를 조정할 것.
 */
export function useSinglePageGuards() {
  const navigate = useNavigate();

  useEffect(() => {
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    const timer = setTimeout(() => {
      navigate({ to: '/home', replace: true });
    }, SESSION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [navigate]);

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
