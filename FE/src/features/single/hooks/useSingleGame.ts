import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';

import { typoCountAtom } from '@/shared/store/typoAtom';

import { MAX_LIVES } from '../store/livesAtom';

import { useEscHandler } from './useEscHandler';
import { type GameStateRef, useGameLifecycle } from './useGameLifecycle';
import { useGameLives } from './useGameLives';
import { useGameScore } from './useGameScore';
import { useGameTimer } from './useGameTimer';
import { useItemSlots } from './useItemSlots';

/**
 * singleBus → Jotai 원자 브릿지 오케스트레이터.
 * 공유 ref를 생성하고 책임별 하위 훅에 주입합니다.
 */
export function useSingleGame() {
  useEscHandler();

  const stateRef = useRef<GameStateRef>({
    lives: MAX_LIVES,
    elapsedMs: 0,
    livesLost: 0,
    churu: 0,
    combo: 0,
    maxCombo: 0,
  });
  const itemSlotsRef = useRef<[boolean, boolean, boolean]>([false, false, false]);
  const commandIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isFinishedRef = useRef(false);

  const typoCount = useAtomValue(typoCountAtom);
  const typoRef = useRef(typoCount);
  useEffect(() => {
    typoRef.current = typoCount;
  }, [typoCount]);

  useGameTimer(stateRef);
  useGameLives(stateRef, commandIndexRef);
  useGameScore(stateRef, commandIndexRef, itemSlotsRef);
  useItemSlots(stateRef, commandIndexRef, itemSlotsRef, isPlayingRef);
  useGameLifecycle({
    stateRef,
    commandIndexRef,
    itemSlotsRef,
    isPlayingRef,
    isFinishedRef,
    typoRef,
  });
}
