import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { activeBranchAtom } from '../store/activeBranchAtom';
import { comboAtom } from '../store/comboAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { gameStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';
import { tutorialInputBlockedAtom } from '../store/tutorialInputBlockedAtom';
import { totalAttemptsAtom, typoCountAtom } from '../store/typoAtom';
import { isSwitchCommand, parseSwitchTarget } from '../utils/branchParser';

/**
 * 커맨드 입력 처리 훅.
 * Enter 입력 시 hit / NORMAL 은닉 SWITCH / 오타 세 경로로 판정하고,
 * EventBus로 Phaser 씬에 결과를 전달합니다.
 */
export function useCommandInput() {
  const commandIndex = useAtomValue(currentCommandIndexAtom);
  const gameStatus = useAtomValue(gameStatusAtom);
  const { commandSet, difficulty } = useSingleStore();
  const [activeBranch, setActiveBranch] = useAtom(activeBranchAtom);

  const setTypoCount = useSetAtom(typoCountAtom);
  const setTotalAttempts = useSetAtom(totalAttemptsAtom);
  const setCombo = useSetAtom(comboAtom);

  const [inputValue, setInputValue] = useState('');
  const [historyText, setHistoryText] = useState('');
  const [isError, setIsError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isTutorialBlocked = useAtomValue(tutorialInputBlockedAtom);
  const isPlaying = gameStatus === 'playing' && !isTutorialBlocked;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPlaying) return;

    if (e.key === 'Enter') {
      e.preventDefault();

      const currentCommand = commandSet[commandIndex];
      if (!currentCommand) return;

      const trimmed = inputValue.trim();
      if (!trimmed) return;
      const isNormal = difficulty === 'NORMAL';
      const textMatches = trimmed === currentCommand.text;
      const branchMatches = !isNormal || activeBranch === currentCommand.branchName;

      setHistoryText(inputValue);

      if (textMatches && branchMatches) {
        setIsError(false);
        setTotalAttempts((prev) => prev + 1);
        EventBus.emit('command:complete', { index: commandIndex });
        if (currentCommand.type === 'CREATE' || currentCommand.type === 'SWITCH') {
          const target = parseSwitchTarget(trimmed);
          if (target) {
            setActiveBranch(target);
            EventBus.emit('branch:switch', { branch: target });
            if (currentCommand.type === 'CREATE') {
              EventBus.emit('lane:create', { branch: target });
            }
          }
        }
      } else if (isNormal && !textMatches && isSwitchCommand(trimmed)) {
        // NORMAL 모드 은닉 SWITCH: 점수·시도 횟수 없이 activeBranch만 업데이트
        const target = parseSwitchTarget(trimmed);
        if (target) {
          setActiveBranch(target);
          EventBus.emit('branch:switch', { branch: target });
        }
        setIsError(false);
      } else {
        // 오타: 콤보 리셋 + 오타 카운트. 목숨 차감 없음 (시간 초과 miss에서만 차감)
        setIsError(true);
        setTotalAttempts((prev) => prev + 1);
        setCombo(0);
        setTypoCount((prev) => prev + 1);
        useSingleStore.getState().appendLog({ seq: commandIndex, event: 'typo' });
        EventBus.emit('command:wrong');
      }

      setInputValue('');
    }
  };

  useEffect(() => {
    if (isPlaying && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPlaying, commandIndex]);

  useEffect(() => {
    const resetInput = () => {
      setInputValue('');
      setHistoryText('');
      setIsError(false);
    };

    const handleMiss = () => {
      setInputValue('');
      setHistoryText('MISS!');
      setIsError(true);
      EventBus.emit('command:wrong');
    };

    EventBus.on('command:miss', handleMiss);
    EventBus.on('game:restart', resetInput);
    EventBus.on('game:over', resetInput);
    EventBus.on('game:complete', resetInput);
    return () => {
      EventBus.off('command:miss', handleMiss);
      EventBus.off('game:restart', resetInput);
      EventBus.off('game:over', resetInput);
      EventBus.off('game:complete', resetInput);
    };
  }, []);

  return {
    inputRef,
    inputValue,
    historyText,
    isError,
    isPlaying,
    handleInputChange,
    handleKeyDown,
  };
}
