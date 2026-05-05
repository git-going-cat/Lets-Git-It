import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Provider } from 'jotai';

import { useSingleStore } from '../store/singleStore';

import PauseModal from './PauseModal';
import ResultModal from './ResultModal';
import SingleGameContent from './SingleGameContent';

// TODO: 개발 완료 후 API 호출로 대체되어야 할 임시 모크 데이터
const MOCK_SESSION = {
  sessionId: 'dev-session',
  difficulty: 'EASY' as const,
  bestScore: 0,
  commandSet: [
    {
      commandSequence: 0,
      text: 'git branch feature',
      displayText: 'git branch feature',
      branchName: 'main',
      type: 'CREATE' as const,
    },
    {
      commandSequence: 1,
      text: 'git checkout feature',
      displayText: 'git checkout feature',
      branchName: 'main',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 2,
      text: 'git add .',
      displayText: 'git add .',
      branchName: 'feature',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 3,
      text: 'git commit -m "feat"',
      displayText: 'git commit -m "feat"',
      branchName: 'feature',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 4,
      text: 'git merge feature',
      displayText: 'git merge feature',
      branchName: 'main',
      type: 'MERGE' as const,
    },
  ],
};

export default function SinglePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    useSingleStore.getState().setSession(MOCK_SESSION);
  }, []);

  // 백엔드 세션은 30분 후 만료되므로 wall-clock 기준으로 리다이렉트
  // TODO: API 연동 후 세션 생성 시각을 받아 남은 시간만큼 타이머를 조정할 것
  useEffect(() => {
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    const timer = setTimeout(() => {
      navigate({ to: '/home', replace: true });
    }, SESSION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [navigate]);

  // 브라우저 뒤로가기/앞으로가기로 게임 화면 재진입 차단
  // - 뒤로가기: popstate 감지 → 가드 플래그 SET → /home replace 이동
  // - 앞으로가기: 마운트 시 가드 플래그 확인 → 플래그 있으면 /home replace 이동
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

  return (
    // Provider 스코프로 감싸 페이지 이탈 시 인게임 atom이 자동 초기화됨
    <Provider>
      <SingleGameContent />
      {/* 모달은 gameStatusAtom을 공유하므로 Provider 안에 위치해야 함 */}
      <PauseModal />
      <ResultModal />
    </Provider>
  );
}
