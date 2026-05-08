import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Provider, useAtomValue } from 'jotai';

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
  if (!result) return null;
  return <GameEndFlowInner key={result.status + result.score} result={result} />;
}

export default function SinglePage() {
  useSinglePageGuards();
  const navigate = useNavigate();
  const { difficulty } = useSearch({ from: '/single' });

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
      useSingleStore.getState().clearSession();
    };
  }, [difficulty, navigate]);

  return (
    <Provider>
      <div className="font-pixel">
        <SingleGameContent />
        <StartModal />
        <PauseModal />
        <GameEndFlow />
      </div>
    </Provider>
  );
}
