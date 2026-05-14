import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';

import { parseSwitchTarget } from '@/shared/game/branchParser';

import { singleBus } from '../bridge/singleBus';
import { activeBranchAtom } from '../store/activeBranchAtom';
import { itemSlotsAtom } from '../store/itemSlotsAtom';
import { livesAtom, MAX_LIVES } from '../store/livesAtom';
import { useSingleStore } from '../store/singleStore';

import type { MutableRefObject } from 'react';

interface GameStateRef {
  lives: number;
}

/**
 * Alt+1/2/3 키와 `item:click` 이벤트를 받아 아이템 사용을 처리합니다.
 *
 * - slot 0 (stash): Phaser 씬에 위임만
 * - slot 1 (cherry-pick): CREATE·SWITCH 커맨드면 activeBranch를 먼저 이동시킨 뒤 씬에 위임
 * - slot 2 (restore): 목숨 +1 (MAX_LIVES 상한)
 *
 * 각 슬롯 사용 후 `item:use`를 emit하면 씬이 후처리를 수행합니다.
 * `isPlayingRef`가 false면 키 입력·클릭 모두 무시됩니다.
 */
export function useItemSlots(
  stateRef: MutableRefObject<GameStateRef>,
  commandIndexRef: MutableRefObject<number>,
  itemSlotsRef: MutableRefObject<[boolean, boolean, boolean]>,
  isPlayingRef: MutableRefObject<boolean>
) {
  const setItemSlots = useSetAtom(itemSlotsAtom);
  const setLives = useSetAtom(livesAtom);
  const setActiveBranch = useSetAtom(activeBranchAtom);
  // CONFLICT 미니게임 진행 중 아이템 사용 차단용 플래그. 도메인 버스 구독으로 유지.
  const isConflictActiveRef = useRef(false);

  useEffect(() => {
    const applyItemSlot = (slotIndex: 0 | 1 | 2) => {
      if (!isPlayingRef.current || !itemSlotsRef.current[slotIndex]) return;
      // 미니게임 중에는 아이템 사용 차단 — cherry-pick으로 CONFLICT를 한 번 더 트리거하는 사고 등 방지.
      if (isConflictActiveRef.current) return;

      itemSlotsRef.current[slotIndex] = false;
      setItemSlots([itemSlotsRef.current[0], itemSlotsRef.current[1], itemSlotsRef.current[2]]);

      if (slotIndex === 2) {
        const newLives = Math.min(stateRef.current.lives + 1, MAX_LIVES);
        stateRef.current.lives = newLives;
        setLives(newLives);
        singleBus.emit('item:use', { slot: 2 });
      } else if (slotIndex === 1) {
        const cmd = useSingleStore.getState().commandSet[commandIndexRef.current];
        if (cmd && (cmd.type === 'CREATE' || cmd.type === 'SWITCH')) {
          const target = parseSwitchTarget(cmd.text);
          if (target) setActiveBranch(target);
        }
        singleBus.emit('item:use', { slot: 1 });
      } else {
        singleBus.emit('item:use', { slot: 0 });
      }
    };

    const handleAltKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const slotIndex = e.key === '1' ? 0 : e.key === '2' ? 1 : e.key === '3' ? 2 : -1;
      if (slotIndex === -1 || !isPlayingRef.current || !itemSlotsRef.current[slotIndex]) return;
      e.preventDefault();
      applyItemSlot(slotIndex as 0 | 1 | 2);
    };

    const unsubItemClick = singleBus.subscribe('item:click', ({ slot }: { slot: 0 | 1 | 2 }) => {
      applyItemSlot(slot);
    });
    const unsubConflictStart = singleBus.subscribe('conflict:start', () => {
      isConflictActiveRef.current = true;
    });
    const unsubConflictResolve = singleBus.subscribe('conflict:resolve', () => {
      isConflictActiveRef.current = false;
    });
    // 게임 종료/재시작 시 플래그 잔존 방지.
    const resetConflictFlag = () => {
      isConflictActiveRef.current = false;
    };
    const unsubRestart = singleBus.subscribe('game:restart', resetConflictFlag);
    const unsubOver = singleBus.subscribe('game:over', resetConflictFlag);
    const unsubComplete = singleBus.subscribe('game:complete', resetConflictFlag);
    window.addEventListener('keydown', handleAltKey);

    return () => {
      unsubItemClick();
      unsubConflictStart();
      unsubConflictResolve();
      unsubRestart();
      unsubOver();
      unsubComplete();
      window.removeEventListener('keydown', handleAltKey);
    };
  }, [
    stateRef,
    commandIndexRef,
    itemSlotsRef,
    isPlayingRef,
    setItemSlots,
    setLives,
    setActiveBranch,
  ]);
}
