import { useEffect } from 'react';
import { useSetAtom } from 'jotai';

import { parseSwitchTarget } from '@/shared/game/branchParser';
import { comboAtom } from '@/shared/store/comboAtom';

import { singleBus } from '../bridge/singleBus';
import { activeBranchAtom } from '../store/activeBranchAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { livesAtom } from '../store/livesAtom';
import { useSingleStore } from '../store/singleStore';

import type { MutableRefObject } from 'react';

interface GameStateRef {
  lives: number;
  livesLost: number;
  combo: number;
}

/**
 * `command:miss` 이벤트를 받아 목숨/콤보 차감 및 commandIndex 동기화를 수행합니다.
 *
 * - 튜토리얼 모드에서는 무시 (낙하 시간이 매우 길어 miss가 사실상 발생하지 않음)
 * - miss여도 CREATE·SWITCH 커맨드면 `activeBranch`를 갱신 — NORMAL 브랜치 판정 정확도 유지
 * - `lives <= 0`이면 `game:over` emit으로 lifecycle 훅에 종료 통지
 */
export function useGameLives(
  stateRef: MutableRefObject<GameStateRef>,
  commandIndexRef: MutableRefObject<number>
) {
  const setLives = useSetAtom(livesAtom);
  const setCombo = useSetAtom(comboAtom);
  const setCommandIndex = useSetAtom(currentCommandIndexAtom);
  const setActiveBranch = useSetAtom(activeBranchAtom);

  useEffect(() => {
    return singleBus.subscribe('command:miss', ({ index }: { index: number }) => {
      if (useSingleStore.getState().isTutorial) return;

      const newLives = stateRef.current.lives - 1;
      stateRef.current.lives = newLives;
      stateRef.current.livesLost += 1;
      stateRef.current.combo = 0;
      commandIndexRef.current = index + 1;
      setLives(newLives);
      setCombo(0);
      setCommandIndex(index + 1);
      useSingleStore.getState().appendLog({ seq: index, event: 'miss' });

      const cmd = useSingleStore.getState().commandSet[index];
      if (cmd && (cmd.type === 'CREATE' || cmd.type === 'SWITCH')) {
        const target = parseSwitchTarget(cmd.text);
        if (target) setActiveBranch(target);
      }
      if (newLives <= 0) {
        singleBus.emit('game:over');
      }
    });
  }, [stateRef, commandIndexRef, setLives, setCombo, setCommandIndex, setActiveBranch]);
}
