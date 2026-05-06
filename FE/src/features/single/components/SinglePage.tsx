import { useEffect } from 'react';
import { Provider } from 'jotai';

import { useSinglePageGuards } from '../hooks/useSinglePageGuards';
import { useSingleStore } from '../store/singleStore';

import PauseModal from './PauseModal';
import ResultModal from './ResultModal';
import SingleGameContent from './SingleGameContent';
import StartModal from './StartModal';

// TODO: 개발 완료 후 API 호출로 대체되어야 할 임시 모크 데이터 (NORMAL 모드)
// NORMAL 모드: CREATE(switch -c)는 노드로 표시, SWITCH(switch)는 히든
// hidden switch 타이밍: seq 7 이후(feat/editor → main), seq 18 이후(feat/comment → main)
const MOCK_SESSION = {
  sessionId: 'dev-session',
  difficulty: 'NORMAL' as const,
  bestScore: 0,
  githubName: 'gitcat-dev',
  commandSet: [
    {
      commandSequence: 0,
      text: 'git fetch origin',
      displayText: 'git fetch origin',
      branchName: 'main',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 1,
      text: 'git pull origin main',
      displayText: 'git pull origin main',
      branchName: 'main',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 2,
      text: 'git switch -c feat/editor',
      displayText: 'git switch -c feat/editor',
      branchName: 'main',
      type: 'CREATE' as const,
    },
    {
      commandSequence: 3,
      text: 'git add src/Editor.js',
      displayText: 'git add src/Editor.js',
      branchName: 'feat/editor',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 4,
      text: 'git commit -m "feat: add post editor"',
      displayText: 'git commit -m "feat: add post editor"',
      branchName: 'feat/editor',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 5,
      text: 'git add src/EditorToolbar.js',
      displayText: 'git add src/EditorToolbar.js',
      branchName: 'feat/editor',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 6,
      text: 'git commit -m "feat: add editor toolbar"',
      displayText: 'git commit -m "feat: add editor toolbar"',
      branchName: 'feat/editor',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 7,
      text: 'git push origin feat/editor',
      displayText: 'git push origin feat/editor',
      branchName: 'feat/editor',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 8,
      text: 'git fetch origin',
      displayText: 'git fetch origin',
      branchName: 'main',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 9,
      text: 'git pull origin main',
      displayText: 'git pull origin main',
      branchName: 'main',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 10,
      text: 'git switch -c feat/comment',
      displayText: 'git switch -c feat/comment',
      branchName: 'main',
      type: 'CREATE' as const,
    },
    {
      commandSequence: 11,
      text: 'git add src/Comment.js',
      displayText: 'git add src/Comment.js',
      branchName: 'feat/comment',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 12,
      text: 'git commit -m "feat: add comment component"',
      displayText: 'git commit -m "feat: add comment component"',
      branchName: 'feat/comment',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 13,
      text: 'git add src/CommentForm.js',
      displayText: 'git add src/CommentForm.js',
      branchName: 'feat/comment',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 14,
      text: 'git commit -m "feat: add comment form"',
      displayText: 'git commit -m "feat: add comment form"',
      branchName: 'feat/comment',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 15,
      text: 'git add src/CommentList.js',
      displayText: 'git add src/CommentList.js',
      branchName: 'feat/comment',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 16,
      text: 'git commit -m "feat: add comment list"',
      displayText: 'git commit -m "feat: add comment list"',
      branchName: 'feat/comment',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 17,
      text: 'git rebase main',
      displayText: 'git rebase main',
      branchName: 'feat/comment',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 18,
      text: 'git push origin feat/comment',
      displayText: 'git push origin feat/comment',
      branchName: 'feat/comment',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 19,
      text: 'git pull origin main',
      displayText: 'git pull origin main',
      branchName: 'main',
      type: 'COMMON' as const,
    },
    {
      commandSequence: 20,
      text: 'git merge feat/editor',
      displayText: 'git merge feat/editor',
      branchName: 'main',
      type: 'MERGE' as const,
    },
    {
      commandSequence: 21,
      text: 'git merge feat/comment',
      displayText: 'git merge feat/comment',
      branchName: 'main',
      type: 'MERGE' as const,
    },
    {
      commandSequence: 22,
      text: 'git push origin main',
      displayText: 'git push origin main',
      branchName: 'main',
      type: 'COMMON' as const,
    },
  ],
};

export default function SinglePage() {
  useSinglePageGuards();

  useEffect(() => {
    useSingleStore.getState().setSession(MOCK_SESSION);
  }, []);

  return (
    // Provider 스코프로 감싸 페이지 이탈 시 인게임 atom이 자동 초기화됨
    <Provider>
      <div className="font-pixel">
        <SingleGameContent />
        {/* 모달은 gameStatusAtom을 공유하므로 Provider 안에 위치해야 함 */}
        <StartModal />
        <PauseModal />
        <ResultModal />
      </div>
    </Provider>
  );
}
