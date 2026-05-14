import { useEffect } from 'react';
import { useSetAtom } from 'jotai';

import { comboAtom } from '@/shared/store/comboAtom';

import { singleBus } from '../bridge/singleBus';
import { churuCountAtom } from '../store/churuAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { itemSlotsAtom } from '../store/itemSlotsAtom';
import { useSingleStore } from '../store/singleStore';

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
 * - SWITCH 외 명령어 성공 시 churu +1 (점수 임계치 계산용)
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
  const setChuru = useSetAtom(churuCountAtom);
  const setItemSlots = useSetAtom(itemSlotsAtom);

  useEffect(() => {
    return singleBus.subscribe('command:complete', ({ index }: { index: number }) => {
      commandIndexRef.current = index + 1;
      setCommandIndex(index + 1);

      stateRef.current.combo += 1;
      if (stateRef.current.combo > stateRef.current.maxCombo) {
        stateRef.current.maxCombo = stateRef.current.combo;
      }
      setCombo((prev) => prev + 1);
      useSingleStore.getState().appendLog({ seq: index, event: 'complete' });

      const completedCmd = useSingleStore.getState().commandSet[index];
      if (completedCmd && completedCmd.type !== 'SWITCH') {
        stateRef.current.churu += 1;
        setChuru((prev) => prev + 1);
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
  }, [stateRef, commandIndexRef, itemSlotsRef, setCommandIndex, setCombo, setChuru, setItemSlots]);
}
