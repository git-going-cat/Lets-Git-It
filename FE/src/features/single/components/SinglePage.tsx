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
      // 결과 저장 중 sessionId가 비워지지 않도록 세션 정리는 다음 진입 시 setSession에 맡긴다.
    };
  }, [difficulty, navigate]);

  if (!sessionId) {
    return (
      <div className="font-pixel flex h-screen items-center justify-center bg-black text-2xl text-white">
        세션을 준비하는 중...
      </div>
    );
  }

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
