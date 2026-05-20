import { useEffect } from 'react';
import { useSetAtom, useStore } from 'jotai';

import { comboAtom } from '@/shared/store/comboAtom';

import { singleBus } from '../bridge/singleBus';
import { churuCountAtom } from '../store/churuAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { commandTimestampsAtom, ROLLING_WINDOW } from '../store/commandTimestampsAtom';
import { itemSlotsAtom } from '../store/itemSlotsAtom';
import { maxComboAtom } from '../store/maxComboAtom';
import { useSingleStore } from '../store/singleStore';
import { elapsedTimeAtom } from '../store/timerAtom';
import { isScoringCommand } from '../utils/scoreCalculator';

import { ITEM_SLOT_MAP } from '../types/single.types';
import type { MutableRefObject } from 'react';

interface GameStateRef {
  combo: number;
  maxCombo: number;
  churu: number;
}

/**
 * `command:complete` 이벤트를 받아 콤보·최대콤보·churu 누적과 commandIndex 동기화를 수행합니다.
 *
 * - churu 카운트: EASY는 모든 명령어, NORMAL/HARD는 SWITCH 제외 (`isScoringCommand` 규칙)
 * - 명령어 완료 시각을 `commandTimestampsAtom`에 푸시 (rolling 평균 속도 계산용, 최근 N개만 유지)
 * - 사전 배정된 itemDrop이 있고 해당 슬롯이 비어 있으면 itemSlot을 채우고 `item:acquired` emit
 * - 슬롯이 이미 차 있으면 드롭 소멸 (획득 불가)
 */
export function useGameScore(
  stateRef: MutableRefObject<GameStateRef>,
  commandIndexRef: MutableRefObject<number>,
  itemSlotsRef: MutableRefObject<[boolean, boolean, boolean]>
) {
  const setCommandIndex = useSetAtom(currentCommandIndexAtom);
  const setCombo = useSetAtom(comboAtom);
  const setMaxCombo = useSetAtom(maxComboAtom);
  const setChuru = useSetAtom(churuCountAtom);
  const setItemSlots = useSetAtom(itemSlotsAtom);
  const setCommandTimestamps = useSetAtom(commandTimestampsAtom);
  const store = useStore();

  useEffect(() => {
    return singleBus.subscribe('command:complete', ({ index }: { index: number }) => {
      commandIndexRef.current = index + 1;
      setCommandIndex(index + 1);

      stateRef.current.combo += 1;
      if (stateRef.current.combo > stateRef.current.maxCombo) {
        stateRef.current.maxCombo = stateRef.current.combo;
        setMaxCombo(stateRef.current.maxCombo);
      }
      setCombo((prev) => prev + 1);

      const { commandSet, difficulty, appendLog } = useSingleStore.getState();
      appendLog({ seq: index, event: 'complete' });

      const completedCmd = commandSet[index];
      if (completedCmd && difficulty && isScoringCommand(completedCmd, difficulty)) {
        stateRef.current.churu += 1;
        setChuru((prev) => prev + 1);

        const now = store.get(elapsedTimeAtom);
        setCommandTimestamps((prev) => {
          const next = prev.length >= ROLLING_WINDOW ? prev.slice(-ROLLING_WINDOW + 1) : prev;
          return [...next, now];
        });
      }

      if (completedCmd?.itemDrop) {
        const slotIndex = ITEM_SLOT_MAP.indexOf(completedCmd.itemDrop);
        if (slotIndex !== -1 && !itemSlotsRef.current[slotIndex]) {
          itemSlotsRef.current[slotIndex] = true;
          setItemSlots([itemSlotsRef.current[0], itemSlotsRef.current[1], itemSlotsRef.current[2]]);
          singleBus.emit('item:acquired', { slot: slotIndex as 0 | 1 | 2 });
        }
      }
    });
  }, [
    stateRef,
    commandIndexRef,
    itemSlotsRef,
    setCommandIndex,
    setCombo,
    setMaxCombo,
    setChuru,
    setItemSlots,
    setCommandTimestamps,
    store,
  ]);
}
