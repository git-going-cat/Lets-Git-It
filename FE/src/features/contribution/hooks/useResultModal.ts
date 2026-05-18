import { useNavigate } from '@tanstack/react-router';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import { useContributionStore } from '../store/contributionStore';
import { gameResultAtom } from '../store/gameResultAtom';

export function useResultModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const [result, setResult] = useAtom(gameResultAtom);
  const myPlayerId = useContributionStore((s) => s.myPlayerId);
  const roomId = useContributionStore((s) => s.roomId);
  const clearSession = useContributionStore((s) => s.clearSession);
  const navigate = useNavigate();

  const isVisible = gameStatus === 'ended' && result !== null;
  const isSuccess = result?.isSuccess === true;
  const rankings = isSuccess ? result.rankings : [];
  const myRank = rankings.find((r) => r.playerId === myPlayerId)?.rank ?? null;
  const reason = result?.reason ?? null;

  const cleanup = () => {
    setResult(null);
    setGameStatus('idle');
    clearSession();
  };

  const onBackToRoom = () => {
    cleanup();
    if (roomId != null) {
      void navigate({ to: '/multi/$roomId', params: { roomId: String(roomId) } });
    } else {
      // roomId 없는 비정상 케이스 — /multi는 mode search가 필수라 결국 /home으로 redirect되므로 직접 보낸다.
      void navigate({ to: '/home' });
    }
  };

  const onHome = () => {
    cleanup();
    void navigate({ to: '/home' });
  };

  return {
    isVisible,
    isSuccess,
    rankings,
    myRank,
    reason,
    myPlayerId,
    onBackToRoom,
    onHome,
  };
}
