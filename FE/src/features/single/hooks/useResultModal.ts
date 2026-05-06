import { useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { gameResultAtom } from '../store/gameResultAtom';
import { gameStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';

/**
 * ResultModal의 표시 여부, 결과 데이터, 버튼 핸들러를 제공합니다.
 *
 * gameStatusAtom이 'gameover' 또는 'cleared'이고 gameResultAtom에 결과가 있을 때 활성화됩니다.
 * isNewRecord: 현재 점수가 singleStore의 bestScore를 초과하면 true를 반환합니다.
 */
export function useResultModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const result = useAtomValue(gameResultAtom);
  const setResult = useSetAtom(gameResultAtom);
  const { bestScore, difficulty } = useSingleStore();
  const navigate = useNavigate();

  const isVisible = (gameStatus === 'gameover' || gameStatus === 'cleared') && result !== null;
  const isNewRecord = result !== null && result.score > (bestScore ?? 0);

  const onRestart = () => {
    setGameStatus('playing');
    setResult(null);
    EventBus.emit('game:restart');
  };

  const onRanking = () => navigate({ to: '/ranking' });
  const onHome = () => navigate({ to: '/home' });

  return { isVisible, result, difficulty, isNewRecord, onRestart, onRanking, onHome };
}
