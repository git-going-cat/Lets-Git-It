import { useEffect } from 'react';
import { useSetAtom } from 'jotai';

import { analytics } from '@/lib/analytics';
import { comboAtom } from '@/shared/store/comboAtom';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';
import { totalAttemptsAtom, typoCountAtom } from '@/shared/store/typoAtom';

import { singleBus } from '../bridge/singleBus';
import { activeBranchAtom } from '../store/activeBranchAtom';
import { churuCountAtom } from '../store/churuAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { commandTimestampsAtom } from '../store/commandTimestampsAtom';
import { gameResultAtom } from '../store/gameResultAtom';
import { itemSlotsAtom } from '../store/itemSlotsAtom';
import { livesAtom, MAX_LIVES } from '../store/livesAtom';
import { livesLostAtom } from '../store/livesLostAtom';
import { maxComboAtom } from '../store/maxComboAtom';
import { useSingleStore } from '../store/singleStore';
import { elapsedTimeAtom } from '../store/timerAtom';
import { calcScore, CHURU_THRESHOLD, countScoringCommands } from '../utils/scoreCalculator';

import type { MutableRefObject } from 'react';

export interface GameStateRef {
  lives: number;
  elapsedMs: number;
  livesLost: number;
  churu: number;
  combo: number;
  maxCombo: number;
}

interface GameLifecycleParams {
  stateRef: MutableRefObject<GameStateRef>;
  commandIndexRef: MutableRefObject<number>;
  itemSlotsRef: MutableRefObject<[boolean, boolean, boolean]>;
  isPlayingRef: MutableRefObject<boolean>;
  isFinishedRef: MutableRefObject<boolean>;
  typoRef: MutableRefObject<number>;
}

/**
 * 게임 생명주기 이벤트(`game:start`/`pause`/`resume`/`over`/`complete`/`restart`/`session-expired`)를 처리합니다.
 *
 * - `resetGame()`: 모든 ref·atom을 초기값으로 되돌림 (start/restart 시 호출)
 * - `finishGame()`: 종료 상태별로 점수·등급을 계산해 `gameResultAtom`에 저장하고 `gameStatusAtom`을 전환
 *   - SUCCESS: `calcScore`로 점수/등급 산출 + analytics.gameCompleted
 *   - GAMEOVER/ESCAPE_FAILED/SESSION_EXPIRED: score 0, grade 'F' + analytics.gameOver
 *
 * `game:complete`는 churu 임계치(`CHURU_THRESHOLD`)에 따라 SUCCESS vs ESCAPE_FAILED를 분기합니다.
 * 튜토리얼 모드에서는 over/complete 모두 `useTutorialMode`가 처리하므로 여기서는 무시합니다.
 */
export function useGameLifecycle({
  stateRef,
  commandIndexRef,
  itemSlotsRef,
  isPlayingRef,
  isFinishedRef,
  typoRef,
}: GameLifecycleParams) {
  const setLives = useSetAtom(livesAtom);
  const setLivesLost = useSetAtom(livesLostAtom);
  const setCombo = useSetAtom(comboAtom);
  const setMaxCombo = useSetAtom(maxComboAtom);
  const setCommandIndex = useSetAtom(currentCommandIndexAtom);
  const setElapsedTime = useSetAtom(elapsedTimeAtom);
  const setTypoCount = useSetAtom(typoCountAtom);
  const setTotalAttempts = useSetAtom(totalAttemptsAtom);
  const setActiveBranch = useSetAtom(activeBranchAtom);
  const setItemSlots = useSetAtom(itemSlotsAtom);
  const setChuru = useSetAtom(churuCountAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const setGameResult = useSetAtom(gameResultAtom);
  const setCommandTimestamps = useSetAtom(commandTimestampsAtom);

  useEffect(() => {
    const resetGame = () => {
      stateRef.current.lives = MAX_LIVES;
      stateRef.current.elapsedMs = 0;
      stateRef.current.livesLost = 0;
      stateRef.current.churu = 0;
      stateRef.current.combo = 0;
      stateRef.current.maxCombo = 0;
      itemSlotsRef.current[0] = false;
      itemSlotsRef.current[1] = false;
      itemSlotsRef.current[2] = false;
      commandIndexRef.current = 0;
      setLives(MAX_LIVES);
      setLivesLost(0);
      setCombo(0);
      setMaxCombo(0);
      setCommandIndex(0);
      setElapsedTime(0);
      setTypoCount(0);
      setTotalAttempts(0);
      setActiveBranch('main');
      setItemSlots([false, false, false]);
      setChuru(0);
      setCommandTimestamps([]);
    };

    resetGame();

    const finishGame = (status: 'SUCCESS' | 'GAMEOVER' | 'ESCAPE_FAILED' | 'SESSION_EXPIRED') => {
      if (isFinishedRef.current) return;
      isFinishedRef.current = true;
      const diff = useSingleStore.getState().difficulty;
      if (!diff) return;
      const playTimeMs = stateRef.current.elapsedMs;
      const missCount = stateRef.current.livesLost;
      const typoCount = typoRef.current;
      if (status !== 'SUCCESS') {
        analytics.gameOver(
          diff,
          playTimeMs,
          status as 'GAMEOVER' | 'ESCAPE_FAILED' | 'SESSION_EXPIRED'
        );
        setGameResult({ status, score: 0, grade: 'F', playTimeMs, missCount, typoCount });
      } else {
        const totalCommands = countScoringCommands(useSingleStore.getState().commandSet, diff);
        const { score, grade } = calcScore({
          playTimeMs,
          typoCount,
          livesLost: missCount,
          difficulty: diff,
          churuCount: stateRef.current.churu,
          totalCommands,
          maxCombo: stateRef.current.maxCombo,
        });
        analytics.gameCompleted(diff, score, playTimeMs);
        setGameResult({ status, score, grade, playTimeMs, missCount, typoCount });
      }
      setGameStatus(status === 'SUCCESS' ? 'cleared' : 'gameover');
    };

    const unsubs = [
      singleBus.subscribe('game:start', () => {
        resetGame();
        isPlayingRef.current = true;
        isFinishedRef.current = false;
      }),
      singleBus.subscribe('game:pause', () => {
        isPlayingRef.current = false;
        setGameStatus('paused');
      }),
      singleBus.subscribe('game:resume', () => {
        isPlayingRef.current = true;
      }),
      singleBus.subscribe('game:over', () => {
        isPlayingRef.current = false;
        if (useSingleStore.getState().isTutorial) return;
        finishGame('GAMEOVER');
      }),
      singleBus.subscribe('game:complete', () => {
        isPlayingRef.current = false;
        const { isTutorial, commandSet, difficulty } = useSingleStore.getState();
        // !difficulty 분기는 TS narrowing 용 — runtime 상 game:complete가 difficulty 미설정 상태로 도달할 일은 없음
        if (isTutorial || !difficulty) return;
        const totalCommands = countScoringCommands(commandSet, difficulty);
        const threshold = Math.ceil(totalCommands * CHURU_THRESHOLD);
        finishGame(stateRef.current.churu >= threshold ? 'SUCCESS' : 'ESCAPE_FAILED');
      }),
      singleBus.subscribe('game:session-expired', () => {
        if (isFinishedRef.current) return;
        isPlayingRef.current = false;
        finishGame('SESSION_EXPIRED');
      }),
      singleBus.subscribe('game:restart', () => {
        isPlayingRef.current = true;
        isFinishedRef.current = false;
        resetGame();
      }),
    ];

    return () => unsubs.forEach((fn) => fn());
  }, [
    stateRef,
    commandIndexRef,
    itemSlotsRef,
    isPlayingRef,
    isFinishedRef,
    typoRef,
    setLives,
    setLivesLost,
    setCombo,
    setCommandIndex,
    setElapsedTime,
    setTypoCount,
    setTotalAttempts,
    setActiveBranch,
    setItemSlots,
    setChuru,
    setMaxCombo,
    setGameStatus,
    setGameResult,
    setCommandTimestamps,
  ]);
}
