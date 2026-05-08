import { useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { gameStatusAtom, prePauseStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';

/**
 * ESC 키로 게임 일시정지·재개를 처리하는 훅.
 * stale closure를 방지하기 위해 statusRef, prePauseStatusRef로 최신 값을 동기화합니다.
 * PauseModal의 useModal ESC 핸들러와 충돌하지 않도록 PauseModal에는 onClose를 전달하지 않아야 합니다.
 */
export function useEscHandler() {
  const [gameStatus, setGameStatus] = useAtom(gameStatusAtom);
  const prePauseStatus = useAtomValue(prePauseStatusAtom);
  const setPrePauseStatus = useSetAtom(prePauseStatusAtom);

  const statusRef = useRef(gameStatus);
  const prePauseStatusRef = useRef(prePauseStatus);

  useEffect(() => {
    statusRef.current = gameStatus;
  }, [gameStatus]);
  useEffect(() => {
    prePauseStatusRef.current = prePauseStatus;
  }, [prePauseStatus]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useSingleStore.getState().isTutorial) {
        // 튜토리얼 모드: ESC → 스킵 확인 모달
        EventBus.emit('tutorial:pause');
        return;
      }
      if (statusRef.current === 'idle' || statusRef.current === 'playing') {
        setPrePauseStatus(statusRef.current);
        EventBus.emit('game:pause');
      } else if (statusRef.current === 'paused') {
        setGameStatus(prePauseStatusRef.current);
        if (prePauseStatusRef.current === 'playing') EventBus.emit('game:resume');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
