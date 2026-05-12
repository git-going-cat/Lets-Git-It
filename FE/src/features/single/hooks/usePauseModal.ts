import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';
import { analytics } from '@/lib/analytics';
import { gameStatusAtom, prePauseStatusAtom } from '@/shared/store/gameStatusAtom';

import { singleApi } from '../api/singleApi';
import { gameResultAtom } from '../store/gameResultAtom';
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
      // setSession 먼저 → status 전환 → 'game:restart' emit으로 Phaser/atom 동기 리셋.
      // idle 상태에서 PauseModal을 띄우고 restart 한 경우(StartModal 화면)는
      // 다시 idle로 돌아가 새 StartModal이 떠야 하므로 game:restart는 emit하지 않는다.
      useSingleStore.getState().setSession(nextSession);
      setGameResult(null);
      const targetStatus = prePauseStatus === 'idle' ? 'idle' : 'playing';
      setGameStatus(targetStatus);
      if (targetStatus === 'playing') {
        EventBus.emit('game:restart', {
          sessionId: nextSession.sessionId,
          difficulty: nextSession.difficulty,
          commandSet: useSingleStore.getState().commandSet,
          isTutorial: useSingleStore.getState().isTutorial,
        });
      }
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
