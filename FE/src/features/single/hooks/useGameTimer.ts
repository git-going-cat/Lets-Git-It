import { useEffect } from 'react';
import { useSetAtom } from 'jotai';

import { singleBus } from '../bridge/singleBus';
import { elapsedTimeAtom } from '../store/timerAtom';

import type { MutableRefObject } from 'react';

/**
 * Phaser의 `timer:tick` 이벤트를 받아 `stateRef.elapsedMs`와 `elapsedTimeAtom`을 동기 갱신합니다.
 * ref는 finishGame 시점에 동기적으로 읽기 위함, atom은 HUD 렌더링용입니다.
 */
export function useGameTimer(stateRef: MutableRefObject<{ elapsedMs: number }>) {
  const setElapsedTime = useSetAtom(elapsedTimeAtom);

  useEffect(() => {
    return singleBus.subscribe('timer:tick', (ms: number) => {
      stateRef.current.elapsedMs = ms;
      setElapsedTime(ms);
    });
  }, [stateRef, setElapsedTime]);
}
