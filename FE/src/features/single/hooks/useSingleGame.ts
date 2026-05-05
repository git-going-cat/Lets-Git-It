import { useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { comboAtom } from '../store/comboAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { gameResultAtom } from '../store/gameResultAtom';
import { gameStatusAtom } from '../store/gameStatusAtom';
import { livesAtom, MAX_LIVES } from '../store/livesAtom';
import { useSingleStore } from '../store/singleStore';
import { elapsedTimeAtom } from '../store/timerAtom';
import { totalAttemptsAtom, typoCountAtom } from '../store/typoAtom';
import { calcScore } from '../utils/scoreCalculator';

/**
 * EventBus → Jotai 원자 브릿지.
 * Phaser 씬이 emit하는 게임 이벤트를 구독하여 HUD 상태를 갱신하고,
 * 게임 종료 시 최종 점수를 계산해 gameResultAtom에 저장합니다.
 */
export function useSingleGame() {
  const setLives = useSetAtom(livesAtom);
  const setCombo = useSetAtom(comboAtom);
  const setCommandIndex = useSetAtom(currentCommandIndexAtom);
  const setElapsedTime = useSetAtom(elapsedTimeAtom);
  const [gameStatus, setGameStatus] = useAtom(gameStatusAtom);
  const setGameResult = useSetAtom(gameResultAtom);
  const setTypoCount = useSetAtom(typoCountAtom);
  const setTotalAttempts = useSetAtom(totalAttemptsAtom);

  // 타이핑 입력 훅에서 갱신되는 오타 수를 게임 종료 시 읽기 위한 ref 동기화
  const typoCount = useAtomValue(typoCountAtom);
  const typoRef = useRef(typoCount);
  useEffect(() => {
    typoRef.current = typoCount;
  }, [typoCount]);

  // ESC 단일 리스너: stale closure 방지를 위해 ref로 최신 상태 동기화
  const statusRef = useRef(gameStatus);
  useEffect(() => {
    statusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (statusRef.current === 'playing') {
        EventBus.emit('game:pause');
      } else if (statusRef.current === 'paused') {
        setGameStatus('playing');
        EventBus.emit('game:resume');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { difficulty } = useSingleStore();
  // 이벤트 핸들러 클로저에서 최신 mutable 상태를 읽기 위한 ref
  const stateRef = useRef({ lives: MAX_LIVES, elapsedMs: 0, difficulty, livesLost: 0 });
  useEffect(() => {
    stateRef.current.difficulty = difficulty;
  }, [difficulty]);

  useEffect(() => {
    const resetGame = () => {
      stateRef.current.lives = MAX_LIVES;
      stateRef.current.elapsedMs = 0;
      stateRef.current.livesLost = 0;
      setLives(MAX_LIVES);
      setCombo(0);
      setCommandIndex(0);
      setElapsedTime(0);
      setTypoCount(0);
      setTotalAttempts(0);
    };

    resetGame();
    setGameStatus('playing');

    const handleMiss = ({ index }: { index: number }) => {
      const newLives = stateRef.current.lives - 1;
      stateRef.current.lives = newLives;
      stateRef.current.livesLost += 1;
      setLives(newLives);
      setCombo(0);
      setCommandIndex(index + 1); // Phaser가 확정한 index 기준으로 동기화
      if (newLives <= 0) {
        EventBus.emit('game:over');
      }
    };

    const handleComplete = ({ index }: { index: number }) => {
      setCommandIndex(index + 1);
      setCombo((prev) => prev + 1);
    };

    const handleTimerTick = (ms: number) => {
      stateRef.current.elapsedMs = ms;
      setElapsedTime(ms);
    };

    const handleGamePause = () => setGameStatus('paused');

    const finishGame = (status: 'SUCCESS' | 'GAMEOVER') => {
      const diff = stateRef.current.difficulty;
      if (!diff) return;
      const playTimeMs = stateRef.current.elapsedMs;
      if (status === 'GAMEOVER') {
        setGameResult({ status, score: 0, grade: 'F', playTimeMs });
      } else {
        const { score, grade } = calcScore({
          playTimeMs,
          typoCount: typoRef.current,
          livesLost: stateRef.current.livesLost,
          difficulty: diff,
        });
        setGameResult({ status, score, grade, playTimeMs });
      }
      setGameStatus(status === 'SUCCESS' ? 'cleared' : 'gameover');
    };

    const handleGameOver = () => finishGame('GAMEOVER');
    const handleGameComplete = () => finishGame('SUCCESS');
    const handleGameRestart = () => resetGame();

    EventBus.on('command:miss', handleMiss);
    EventBus.on('command:complete', handleComplete);
    EventBus.on('timer:tick', handleTimerTick);
    EventBus.on('game:pause', handleGamePause);
    EventBus.on('game:over', handleGameOver);
    EventBus.on('game:complete', handleGameComplete);
    EventBus.on('game:restart', handleGameRestart);

    return () => {
      EventBus.off('command:miss', handleMiss);
      EventBus.off('command:complete', handleComplete);
      EventBus.off('timer:tick', handleTimerTick);
      EventBus.off('game:pause', handleGamePause);
      EventBus.off('game:over', handleGameOver);
      EventBus.off('game:complete', handleGameComplete);
      EventBus.off('game:restart', handleGameRestart);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
