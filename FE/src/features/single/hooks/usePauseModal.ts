import { useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { gameStatusAtom } from '../store/gameStatusAtom';
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
  const navigate = useNavigate();

  const isTutorial = useSingleStore((s) => s.isTutorial);
  const isVisible = gameStatus === 'paused' && !isTutorial;

  const onResume = () => {
    setGameStatus('playing');
    EventBus.emit('game:resume');
  };

  const onRestart = () => {
    setGameStatus('playing');
    EventBus.emit('game:restart');
  };

  const onExit = () => navigate({ to: '/home', replace: true });

  return { isVisible, onResume, onRestart, onExit };
}
