import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Provider, useAtomValue } from 'jotai';

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

  useEffect(() => {
    if (!difficulty) return;

    let cancelled = false;

    singleApi
      .startSession(difficulty)
      .then((data) => {
        if (!cancelled) useSingleStore.getState().setSession(data);
      })
      .catch(() => {
        if (!cancelled) void navigate({ to: '/home', replace: true });
      });

    return () => {
      cancelled = true;
      // clearSession()을 호출하지 않는 이유:
      //   결과 저장이 in-flight인 상태에서 cleanup이 발화하면 sessionId/difficulty가 null로 비워져
      //   useResultModal의 응답 처리 또는 mypage invalidate가 잘못된 상태로 진행될 위험.
      //   useSingleStore는 single 도메인 외부에서 읽지 않으므로 다음 /single 진입 시
      //   setSession()이 덮어쓰면 충분하고, /home 등 다른 페이지에 데이터 누수가 없음.
    };
  }, [difficulty, navigate]);

  return (
    <Provider>
      <div className="font-pixel">
        <SingleGameContent />
        <StartModal key={sessionId ?? 'start-modal'} />
        <PauseModal />
        <GameEndFlow />
      </div>
    </Provider>
  );
}
