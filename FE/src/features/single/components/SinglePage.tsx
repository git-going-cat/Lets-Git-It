import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Provider, useAtomValue } from 'jotai';

import { Win11Dialog } from '@/shared/components/Win11Dialog';
import { useBgm } from '@/shared/hooks/useBgm';

import { singleApi } from '../api/singleApi';
import { useSinglePageGuards } from '../hooks/useSinglePageGuards';
import { churuCountAtom } from '../store/churuAtom';
import { gameResultAtom } from '../store/gameResultAtom';
import { useSingleStore } from '../store/singleStore';
import { CHURU_THRESHOLD } from '../utils/scoreCalculator';

import GameEndScreen from './GameEndScreen';
import PauseModal from './PauseModal';
import ResultModal from './ResultModal';
import SingleGameContent from './SingleGameContent';
import StartModal from './StartModal';

import type { GameResult } from '../store/gameResultAtom';

function GameEndFlowInner({ result }: { result: GameResult }) {
  const [videoWatched, setVideoWatched] = useState(false);
  const churuCount = useAtomValue(churuCountAtom);
  const commandSet = useSingleStore((s) => s.commandSet);

  if (result.status === 'SESSION_EXPIRED') return <ResultModal />;

  if (!videoWatched) {
    const totalCommands = commandSet.length;
    const threshold = Math.ceil(totalCommands * CHURU_THRESHOLD);
    const churuRatio = threshold > 0 ? Math.min(churuCount / threshold, 1) : 0;
    return (
      <GameEndScreen
        status={result.status}
        churuRatio={churuRatio}
        onVideoEnd={() => setVideoWatched(true)}
      />
    );
  }

  return <ResultModal />;
}

function GameEndFlow() {
  const result = useAtomValue(gameResultAtom);
  const sessionId = useSingleStore((state) => state.sessionId);
  if (!result) return null;
  return <GameEndFlowInner key={`${sessionId}-${result.status}-${result.score}`} result={result} />;
}

export default function SinglePage() {
  useBgm({ resetOnMount: true });
  useSinglePageGuards();
  const navigate = useNavigate();
  const { difficulty } = useSearch({ from: '/single' });
  const sessionId = useSingleStore((state) => state.sessionId);
  const startSessionError = useSingleStore((state) => state.startSessionError);

  useEffect(() => {
    if (!difficulty) return;

    // Win11ExplorerModal에서 startSession을 미리 호출해 store에 세션을 넣은 경우
    // 동일 난이도면 중복 호출을 skip한다. (난이도가 다르면 stale session이므로 새로 받는다.)
    const current = useSingleStore.getState();
    if (current.sessionId && current.difficulty === difficulty) return;

    // 이전 진입에서 남은 stale 세션을 초기화. 같은 페이지에 재진입할 때 이전
    // sessionId/commandSet/sessionExpiresAt이 남아있으면 SingleGameContent가
    // stale data로 Phaser scene을 init하거나 useSinglePageGuards가 만료된
    // sessionExpiresAt으로 즉시 expire를 발화한다.
    useSingleStore.getState().clearSession();

    let cancelled = false;

    singleApi
      .startSession(difficulty)
      .then((data) => {
        if (!cancelled) useSingleStore.getState().setSession(data);
      })
      .catch(() => {
        if (!cancelled) useSingleStore.getState().setStartSessionError(true);
      });

    return () => {
      cancelled = true;
      // 결과 저장 중 sessionId가 비워지지 않도록 unmount cleanup에서는 세션 정리를 하지 않는다.
      // 다음 진입 시 위의 clearSession()이 안전 시점에 처리한다.
    };
  }, [difficulty]);

  // 다이얼로그 [확인] 핸들러.
  // - sessionId 있음(PauseModal/ResultModal '다시하기' 실패): 플래그만 해제하고 현재 화면에 머문다.
  //   기존 PauseModal/ResultModal이 다시 표시되므로 사용자는 그 자리에서 재시도 가능.
  // - sessionId 없음(URL 직접 진입 실패): home으로 복귀하고 모드 선택 모달을 다시 열어 재선택 유도.
  const handleErrorDialogClose = () => {
    useSingleStore.getState().setStartSessionError(false);
    if (sessionId) return;
    void navigate({ to: '/home', search: { modal: 'explorer-single' }, replace: true });
  };

  return (
    <>
      {!sessionId ? (
        <div className="font-pixel flex h-screen items-center justify-center bg-black text-2xl text-white">
          세션을 준비하는 중...
        </div>
      ) : (
        <Provider>
          <div className="font-pixel">
            <SingleGameContent />
            <StartModal key={sessionId ?? 'start-modal'} />
            <PauseModal />
            <GameEndFlow />
          </div>
        </Provider>
      )}
      {startSessionError && (
        <Win11Dialog
          title="게임 시작 실패"
          message={'서버에서 응답을 받지 못했어요.\n잠시 후 다시 시도해 주세요.'}
          onClose={handleErrorDialogClose}
        />
      )}
    </>
  );
}
