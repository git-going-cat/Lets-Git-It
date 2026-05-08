import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';
import { analytics } from '@/lib/analytics';

import { singleApi } from '../api/singleApi';
import { gameResultAtom } from '../store/gameResultAtom';
import { gameStatusAtom, prePauseStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';

/**
 * PauseModal의 표시 여부와 버튼 핸들러를 제공합니다.
 *
 * gameStatusAtom이 'paused'일 때 모달이 활성화됩니다.
 * ESC 처리는 useSingleGame의 전역 리스너가 담당하므로 이 훅에서는 다루지 않습니다.
 */
export function usePauseModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const setGameResult = useSetAtom(gameResultAtom);
  const prePauseStatus = useAtomValue(prePauseStatusAtom);
  const navigate = useNavigate();
  const [isRestarting, setIsRestarting] = useState(false);

  const isTutorial = useSingleStore((s) => s.isTutorial);
  const difficulty = useSingleStore((s) => s.difficulty);
  const isVisible = gameStatus === 'paused' && !isTutorial;

  const onResume = () => {
    setGameStatus(prePauseStatus);
    // idle에서 pause된 경우 Phaser는 아직 미시작 상태이므로 resume 이벤트 불필요
    if (prePauseStatus === 'playing') EventBus.emit('game:resume');
  };

  const onRestart = async () => {
    if (isRestarting) return;
    if (!difficulty) {
      navigate({ to: '/home', replace: true });
      return;
    }

    setIsRestarting(true);
    try {
      const nextSession = await singleApi.startSession(difficulty);
      setGameResult(null);
      setGameStatus(prePauseStatus === 'idle' ? 'idle' : 'playing');
      useSingleStore.getState().setSession(nextSession);
    } catch {
      navigate({ to: '/home', replace: true });
    } finally {
      setIsRestarting(false);
    }
  };

  const onExit = () => {
    analytics.gameAbandoned();
    navigate({ to: '/home', replace: true });
  };

  return { isVisible, onResume, onRestart, onExit };
}
