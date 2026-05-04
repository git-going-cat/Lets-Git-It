import { useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { gameStatusAtom } from '../store/gameStatusAtom';

/**
 * PauseModal의 표시 여부와 버튼 핸들러를 제공합니다.
 *
 * gameStatusAtom이 'paused'일 때 모달이 활성화됩니다.
 * ESC 및 이어하기: 'playing'으로 전환 후 EventBus game:resume 발행합니다.
 */
export function usePauseModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const navigate = useNavigate();

  const isVisible = gameStatus === 'paused';

  const onResume = () => {
    setGameStatus('playing');
    EventBus.emit('game:resume');
  };

  const onRestart = () => {
    setGameStatus('playing');
    EventBus.emit('game:restart');
  };

  // TODO: 설정 모달 오픈 (팀원 구현 완료 후 연결)
  const onSettings = () => {};

  const onExit = () => navigate({ to: '/' });

  return { isVisible, onResume, onRestart, onSettings, onExit };
}
