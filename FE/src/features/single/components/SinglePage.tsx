import { useEffect } from 'react';
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
