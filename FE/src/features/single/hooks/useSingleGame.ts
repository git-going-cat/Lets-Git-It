import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { analytics } from '@/lib/analytics';
import { parseSwitchTarget } from '@/shared/game/branchParser';
import { comboAtom } from '@/shared/store/comboAtom';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';
import { totalAttemptsAtom, typoCountAtom } from '@/shared/store/typoAtom';

import { singleBus } from '../bridge/singleBus';
import { activeBranchAtom } from '../store/activeBranchAtom';
import { churuCountAtom } from '../store/churuAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { gameResultAtom } from '../store/gameResultAtom';
import { itemSlotsAtom } from '../store/itemSlotsAtom';
import { livesAtom, MAX_LIVES } from '../store/livesAtom';
import { useSingleStore } from '../store/singleStore';
import { elapsedTimeAtom } from '../store/timerAtom';
import { calcScore, CHURU_THRESHOLD } from '../utils/scoreCalculator';

import { useEscHandler } from './useEscHandler';

import { ITEM_SLOT_MAP } from '../types/single.types';

/**
 * singleBus → Jotai 원자 브릿지.
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
    // lives·elapsedMs·livesLost·churu·combo는 singleBus 핸들러 클로저에서 직접 변경되므로 ref로 관리
    const stateRef = {
      lives: MAX_LIVES,
      elapsedMs: 0,
      livesLost: 0,
      churu: 0,
      combo: 0,
      maxCombo: 0,
    };
    // itemSlots·commandIndex는 핸들러 내에서 setXxx 호출 직후 ref도 함께 갱신해 stale closure를 방지
    const itemSlotsRef: [boolean, boolean, boolean] = [false, false, false];
    const commandIndexRef = { current: 0 };

    const resetGame = () => {
      stateRef.lives = MAX_LIVES;
      stateRef.elapsedMs = 0;
      stateRef.livesLost = 0;
      stateRef.churu = 0;
      stateRef.combo = 0;
      stateRef.maxCombo = 0;
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
    let isFinished = false;

    const handleMiss = ({ index }: { index: number }) => {
      // 튜토리얼 모드: 낙하 시간이 매우 길어 miss가 사실상 발생하지 않으나,
      // 혹시 발생하더라도 목숨 차감 및 게임오버 처리를 건너뜀
      if (useSingleStore.getState().isTutorial) return;

      const newLives = stateRef.lives - 1;
      stateRef.lives = newLives;
      stateRef.livesLost += 1;
      stateRef.combo = 0;
      commandIndexRef.current = index + 1;
      setLives(newLives);
      setCombo(0);
      setCommandIndex(index + 1); // Phaser가 확정한 index 기준으로 동기화
      useSingleStore.getState().appendLog({ seq: index, event: 'miss' });
      // miss여도 CREATE·SWITCH 커맨드의 activeBranch를 갱신해야 NORMAL 브랜치 판정이 정확함
      const cmd = useSingleStore.getState().commandSet[index];
      if (cmd && (cmd.type === 'CREATE' || cmd.type === 'SWITCH')) {
        const target = parseSwitchTarget(cmd.text);
        if (target) setActiveBranch(target);
      }
      if (newLives <= 0) {
        singleBus.emit('game:over');
      }
    };

    const handleComplete = ({ index }: { index: number }) => {
      commandIndexRef.current = index + 1;
      setCommandIndex(index + 1);
      stateRef.combo += 1;
      if (stateRef.combo > stateRef.maxCombo) stateRef.maxCombo = stateRef.combo;
      setCombo((prev) => prev + 1);
      useSingleStore.getState().appendLog({ seq: index, event: 'complete' });

      // 성공한 명령어만 churu 지급 (SWITCH 제외), 아이템 드롭도 동일 참조 사용
      const completedCmd = useSingleStore.getState().commandSet[index];
      if (completedCmd && completedCmd.type !== 'SWITCH') {
        stateRef.churu += 1;
        setChuru((prev) => prev + 1);
      }

      // 아이템 드롭: 세션 시작 시 사전 배정된 itemDrop 확인 (miss 시엔 호출 안 됨)
      if (completedCmd?.itemDrop) {
        const slotIndex = ITEM_SLOT_MAP.indexOf(completedCmd.itemDrop);
        if (slotIndex !== -1 && !itemSlotsRef[slotIndex]) {
          itemSlotsRef[slotIndex] = true;
          setItemSlots([itemSlotsRef[0], itemSlotsRef[1], itemSlotsRef[2]]);
          singleBus.emit('item:acquired', { slot: slotIndex as 0 | 1 | 2 });
        }
        // 슬롯이 이미 찼으면 아이템 소멸 (획득 불가)
      }
    };

    const handleTimerTick = (ms: number) => {
      stateRef.elapsedMs = ms;
      setElapsedTime(ms);
    };

    const handleGameStart = () => {
      resetGame();
      isPlaying = true;
      isFinished = false;
    };

    const handleGamePause = () => {
      isPlaying = false;
      setGameStatus('paused');
    };

    const handleGameResume = () => {
      isPlaying = true;
    };

    const finishGame = (status: 'SUCCESS' | 'GAMEOVER' | 'ESCAPE_FAILED' | 'SESSION_EXPIRED') => {
      if (isFinished) return;
      isFinished = true;
      const diff = useSingleStore.getState().difficulty;
      if (!diff) return;
      const playTimeMs = stateRef.elapsedMs;
      const missCount = stateRef.livesLost;
      const typoCount = typoRef.current;
      if (status !== 'SUCCESS') {
        analytics.gameOver(diff, playTimeMs);
        setGameResult({ status, score: 0, grade: 'F', playTimeMs, missCount, typoCount });
      } else {
        const totalCommands = useSingleStore
          .getState()
          .commandSet.filter((c) => c.type !== 'SWITCH').length;
        const { score, grade } = calcScore({
          playTimeMs,
          typoCount,
          livesLost: missCount,
          difficulty: diff,
          churuCount: stateRef.churu,
          totalCommands,
          maxCombo: stateRef.maxCombo,
        });
        analytics.gameCompleted(diff, score, playTimeMs);
        setGameResult({ status, score, grade, playTimeMs, missCount, typoCount });
      }
      setGameStatus(status === 'SUCCESS' ? 'cleared' : 'gameover');
    };

    const handleGameOver = () => {
      isPlaying = false;
      // 튜토리얼 모드에서는 결과 모달 표시 없이 useTutorialMode가 완료 처리
      if (useSingleStore.getState().isTutorial) return;
      finishGame('GAMEOVER');
    };
    const handleGameComplete = () => {
      isPlaying = false;
      // 튜토리얼 모드에서는 결과 모달 표시 없이 useTutorialMode가 완료 처리
      if (useSingleStore.getState().isTutorial) return;
      const totalCommands = useSingleStore
        .getState()
        .commandSet.filter((c) => c.type !== 'SWITCH').length;
      const threshold = Math.ceil(totalCommands * CHURU_THRESHOLD);
      finishGame(stateRef.churu >= threshold ? 'SUCCESS' : 'ESCAPE_FAILED');
    };
    const handleSessionExpired = () => {
      if (isFinished) return;
      isPlaying = false;
      finishGame('SESSION_EXPIRED');
    };
    const handleGameRestart = () => {
      isPlaying = true;
      isFinished = false;
      resetGame();
    };

    // Alt+1(stash) / Alt+2(cherry-pick) / Alt+3(restore) 아이템 사용
    const applyItemSlot = (slotIndex: 0 | 1 | 2) => {
      if (!isPlaying || !itemSlotsRef[slotIndex]) return;

      itemSlotsRef[slotIndex] = false;
      setItemSlots([itemSlotsRef[0], itemSlotsRef[1], itemSlotsRef[2]]);

      if (slotIndex === 2) {
        // restore: 목숨 +1
        const newLives = Math.min(stateRef.lives + 1, MAX_LIVES);
        stateRef.lives = newLives;
        setLives(newLives);
        singleBus.emit('item:use', { slot: 2 });
      } else if (slotIndex === 1) {
        // cherry-pick: CREATE·SWITCH면 activeBranch 먼저 이동 후 Phaser에 위임
        const cmd = useSingleStore.getState().commandSet[commandIndexRef.current];
        if (cmd && (cmd.type === 'CREATE' || cmd.type === 'SWITCH')) {
          const target = parseSwitchTarget(cmd.text);
          if (target) setActiveBranch(target);
        }
        singleBus.emit('item:use', { slot: 1 });
      } else {
        // stash: Phaser에 위임 (slot 0)
        singleBus.emit('item:use', { slot: 0 });
      }
    };

    const handleAltKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const slotIndex = e.key === '1' ? 0 : e.key === '2' ? 1 : e.key === '3' ? 2 : -1;
      if (slotIndex === -1 || !isPlaying || !itemSlotsRef[slotIndex]) return;
      e.preventDefault();
      applyItemSlot(slotIndex as 0 | 1 | 2);
    };

    const handleItemClick = ({ slot }: { slot: 0 | 1 | 2 }) => {
      applyItemSlot(slot);
    };

    const unsubs = [
      singleBus.subscribe('game:start', handleGameStart),
      singleBus.subscribe('command:miss', handleMiss),
      singleBus.subscribe('command:complete', handleComplete),
      singleBus.subscribe('timer:tick', handleTimerTick),
      singleBus.subscribe('game:pause', handleGamePause),
      singleBus.subscribe('game:resume', handleGameResume),
      singleBus.subscribe('game:over', handleGameOver),
      singleBus.subscribe('game:complete', handleGameComplete),
      singleBus.subscribe('game:session-expired', handleSessionExpired),
      singleBus.subscribe('game:restart', handleGameRestart),
      singleBus.subscribe('item:click', handleItemClick),
    ];
    window.addEventListener('keydown', handleAltKey);

    return () => {
      unsubs.forEach((fn) => fn());
      window.removeEventListener('keydown', handleAltKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
