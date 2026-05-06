import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { activeBranchAtom } from '../store/activeBranchAtom';
import { churuCountAtom } from '../store/churuAtom';
import { comboAtom } from '../store/comboAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { gameResultAtom } from '../store/gameResultAtom';
import { gameStatusAtom } from '../store/gameStatusAtom';
import { itemSlotsAtom } from '../store/itemSlotsAtom';
import { livesAtom, MAX_LIVES } from '../store/livesAtom';
import { useSingleStore } from '../store/singleStore';
import { elapsedTimeAtom } from '../store/timerAtom';
import { totalAttemptsAtom, typoCountAtom } from '../store/typoAtom';
import { parseSwitchTarget } from '../utils/branchParser';
import { calcScore } from '../utils/scoreCalculator';

import { useEscHandler } from './useEscHandler';

const DROP_RATE = { EASY: 0.4, NORMAL: 0.3, HARD: 0.2 } as const;

/**
 * EventBus → Jotai 원자 브릿지.
 * Phaser 씬이 emit하는 게임 이벤트를 구독하여 HUD 상태를 갱신하고,
 * 게임 종료 시 최종 점수를 계산해 gameResultAtom에 저장합니다.
 * Alt+1/2/3 아이템 사용 키 리스너도 여기서 등록합니다.
 */
export function useSingleGame() {
  useEscHandler();

  const setLives = useSetAtom(livesAtom);
  const setCombo = useSetAtom(comboAtom);
  const setCommandIndex = useSetAtom(currentCommandIndexAtom);
  const setElapsedTime = useSetAtom(elapsedTimeAtom);
  const setActiveBranch = useSetAtom(activeBranchAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const setGameResult = useSetAtom(gameResultAtom);
  const setTypoCount = useSetAtom(typoCountAtom);
  const setTotalAttempts = useSetAtom(totalAttemptsAtom);
  const setItemSlots = useSetAtom(itemSlotsAtom);
  const setChuru = useSetAtom(churuCountAtom);

  // typoCountAtom은 useCommandInput에서도 갱신되므로 ref로 동기화해 finishGame에서 읽는다
  const typoCount = useAtomValue(typoCountAtom);
  const typoRef = useRef(typoCount);
  useEffect(() => {
    typoRef.current = typoCount;
  }, [typoCount]);

  useEffect(() => {
    // lives·elapsedMs·livesLost는 EventBus 핸들러 클로저에서 직접 변경되므로 ref로 관리
    const stateRef = { lives: MAX_LIVES, elapsedMs: 0, livesLost: 0 };
    // itemSlots·commandIndex는 핸들러 내에서 setXxx 호출 직후 ref도 함께 갱신해 stale closure를 방지
    const itemSlotsRef: [boolean, boolean, boolean] = [false, false, false];
    const commandIndexRef = { current: 0 };

    const resetGame = () => {
      stateRef.lives = MAX_LIVES;
      stateRef.elapsedMs = 0;
      stateRef.livesLost = 0;
      itemSlotsRef[0] = false;
      itemSlotsRef[1] = false;
      itemSlotsRef[2] = false;
      commandIndexRef.current = 0;
      setLives(MAX_LIVES);
      setCombo(0);
      setCommandIndex(0);
      setElapsedTime(0);
      setTypoCount(0);
      setTotalAttempts(0);
      setActiveBranch('main');
      setItemSlots([false, false, false]);
      setChuru(0);
    };

    resetGame();
    // 'idle' 상태 유지 — StartModal의 game:start 이벤트로 게임이 시작됨

    // Alt 핸들러에서 게임 상태를 확인하기 위한 로컬 플래그
    let isPlaying = false;

    const addChuruForCommand = (index: number) => {
      const cmd = useSingleStore.getState().commandSet[index];
      if (cmd && cmd.type !== 'SWITCH') {
        setChuru((prev) => prev + 1);
      }
    };

    const handleMiss = ({ index }: { index: number }) => {
      const newLives = stateRef.lives - 1;
      stateRef.lives = newLives;
      stateRef.livesLost += 1;
      commandIndexRef.current = index + 1;
      setLives(newLives);
      setCombo(0);
      setCommandIndex(index + 1); // Phaser가 확정한 index 기준으로 동기화
      addChuruForCommand(index);
      // miss여도 CREATE·SWITCH 커맨드의 activeBranch를 갱신해야 NORMAL 브랜치 판정이 정확함
      const cmd = useSingleStore.getState().commandSet[index];
      if (cmd && (cmd.type === 'CREATE' || cmd.type === 'SWITCH')) {
        const target = parseSwitchTarget(cmd.text);
        if (target) setActiveBranch(target);
      }
      if (newLives <= 0) {
        EventBus.emit('game:over');
      }
    };

    const handleComplete = ({ index }: { index: number }) => {
      commandIndexRef.current = index + 1;
      setCommandIndex(index + 1);
      setCombo((prev) => prev + 1);

      addChuruForCommand(index);

      // 아이템 드롭: 난이도별 확률로 빈 슬롯 중 하나에 랜덤 배정
      const diff = useSingleStore.getState().difficulty;
      if (diff && Math.random() < DROP_RATE[diff]) {
        const emptyIndices = itemSlotsRef
          .map((filled, i) => (!filled ? i : -1))
          .filter((i) => i !== -1);
        if (emptyIndices.length > 0) {
          const slotToFill = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          itemSlotsRef[slotToFill] = true;
          setItemSlots([itemSlotsRef[0], itemSlotsRef[1], itemSlotsRef[2]]);
        }
      }
    };

    const handleTimerTick = (ms: number) => {
      stateRef.elapsedMs = ms;
      setElapsedTime(ms);
    };

    const handleGameStart = () => {
      isPlaying = true;
    };

    const handleGamePause = () => {
      isPlaying = false;
      setGameStatus('paused');
    };

    const handleGameResume = () => {
      isPlaying = true;
    };

    const finishGame = (status: 'SUCCESS' | 'GAMEOVER') => {
      const diff = useSingleStore.getState().difficulty;
      if (!diff) return;
      const playTimeMs = stateRef.elapsedMs;
      const missCount = stateRef.livesLost;
      const typoCount = typoRef.current;
      if (status === 'GAMEOVER') {
        setGameResult({ status, score: 0, grade: 'F', playTimeMs, missCount, typoCount });
      } else {
        const { score, grade } = calcScore({
          playTimeMs,
          typoCount,
          livesLost: missCount,
          difficulty: diff,
        });
        setGameResult({ status, score, grade, playTimeMs, missCount, typoCount });
      }
      setGameStatus(status === 'SUCCESS' ? 'cleared' : 'gameover');
    };

    const handleGameOver = () => {
      isPlaying = false;
      finishGame('GAMEOVER');
    };
    const handleGameComplete = () => {
      isPlaying = false;
      finishGame('SUCCESS');
    };
    const handleGameRestart = () => {
      isPlaying = true;
      resetGame();
    };

    // Alt+1(stash) / Alt+2(cherry-pick) / Alt+3(restore) 아이템 사용
    const handleAltKey = (e: KeyboardEvent) => {
      if (!e.altKey || !isPlaying) return;
      const slotIndex = e.key === '1' ? 0 : e.key === '2' ? 1 : e.key === '3' ? 2 : -1;
      if (slotIndex === -1 || !itemSlotsRef[slotIndex]) return;
      e.preventDefault();

      itemSlotsRef[slotIndex] = false;
      setItemSlots([itemSlotsRef[0], itemSlotsRef[1], itemSlotsRef[2]]);

      if (slotIndex === 2) {
        // restore: 목숨 +1
        const newLives = Math.min(stateRef.lives + 1, MAX_LIVES);
        stateRef.lives = newLives;
        setLives(newLives);
      } else if (slotIndex === 1) {
        // cherry-pick: CREATE·SWITCH면 activeBranch 먼저 이동 후 Phaser에 위임
        const cmd = useSingleStore.getState().commandSet[commandIndexRef.current];
        if (cmd && (cmd.type === 'CREATE' || cmd.type === 'SWITCH')) {
          const target = parseSwitchTarget(cmd.text);
          if (target) setActiveBranch(target);
        }
        EventBus.emit('item:use', { slot: 1 });
      } else {
        // stash: Phaser에 위임 (slot 0)
        EventBus.emit('item:use', { slot: 0 });
      }
    };

    EventBus.on('game:start', handleGameStart);
    EventBus.on('command:miss', handleMiss);
    EventBus.on('command:complete', handleComplete);
    EventBus.on('timer:tick', handleTimerTick);
    EventBus.on('game:pause', handleGamePause);
    EventBus.on('game:resume', handleGameResume);
    EventBus.on('game:over', handleGameOver);
    EventBus.on('game:complete', handleGameComplete);
    EventBus.on('game:restart', handleGameRestart);
    window.addEventListener('keydown', handleAltKey);

    return () => {
      EventBus.off('game:start', handleGameStart);
      EventBus.off('command:miss', handleMiss);
      EventBus.off('command:complete', handleComplete);
      EventBus.off('timer:tick', handleTimerTick);
      EventBus.off('game:pause', handleGamePause);
      EventBus.off('game:resume', handleGameResume);
      EventBus.off('game:over', handleGameOver);
      EventBus.off('game:complete', handleGameComplete);
      EventBus.off('game:restart', handleGameRestart);
      window.removeEventListener('keydown', handleAltKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
