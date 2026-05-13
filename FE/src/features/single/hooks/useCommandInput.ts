import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';
import { isSwitchCommand, parseSwitchTarget } from '@/shared/game/branchParser';
import { comboAtom } from '@/shared/store/comboAtom';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';
import { totalAttemptsAtom, typoCountAtom } from '@/shared/store/typoAtom';

import { activeBranchAtom } from '../store/activeBranchAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { useSingleStore } from '../store/singleStore';
import { tutorialInputBlockedAtom } from '../store/tutorialInputBlockedAtom';

import { useExistingBranches } from './useExistingBranches';

export type HistoryStatus = 'ok' | 'typo' | 'miss' | 'wrong-branch' | 'switch';

/**
 * 커맨드 입력 처리 훅.
 * Enter 입력 시 hit / NORMAL 은닉 SWITCH / 잘못된 브랜치 / 오타 네 경로로 판정하고,
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
  const [history, setHistory] = useState<{ text: string; status: HistoryStatus }[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const isTutorialBlocked = useAtomValue(tutorialInputBlockedAtom);
  const isPlaying = gameStatus === 'playing' && !isTutorialBlocked;

  const existingBranches = useExistingBranches();

  // MERGE 등으로 activeBranch가 가리키는 레인이 사라지면 main으로 강제 복귀.
  // PlayerCharacter가 숨겨진 레인 위에 그려지는 시각 이슈를 차단한다.
  useEffect(() => {
    if (!existingBranches.has(activeBranch)) {
      setActiveBranch('main');
      EventBus.emit('branch:switch', { branch: 'main' });
    }
  }, [activeBranch, existingBranches, setActiveBranch]);

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

      // 오타 페널티 — 콤보 리셋 + typoCount 증가 + 로그 + Phaser 알림.
      // 목숨은 차감하지 않는다 (시간 초과 miss 경로에서만 차감).
      const applyTypoPenalty = () => {
        setTotalAttempts((prev) => prev + 1);
        setCombo(0);
        setTypoCount((prev) => prev + 1);
        useSingleStore.getState().appendLog({ seq: commandIndex, event: 'typo' });
        EventBus.emit('command:wrong');
      };

      if (textMatches && branchMatches) {
        setHistory((prev) => [...prev, { text: inputValue, status: 'ok' }]);
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
        // NORMAL 모드 은닉 SWITCH: 점수·시도 횟수 없이 activeBranch만 업데이트.
        // 잘못된 브랜치에 있어도 git switch로 빠져나올 수 있어야 하므로 브랜치 체크보다 먼저 처리.
        // 단, 존재하지 않는 브랜치로의 이동은 거부하고 안내 메시지 + 오타 처리한다.
        const target = parseSwitchTarget(trimmed);
        if (target && existingBranches.has(target)) {
          setHistory((prev) => [...prev, { text: inputValue, status: 'switch' }]);
          setActiveBranch(target);
          EventBus.emit('branch:switch', { branch: target });
        } else {
          setHistory((prev) => [
            ...prev,
            { text: '존재하지 않는 브랜치입니다!', status: 'wrong-branch' },
          ]);
          applyTypoPenalty();
        }
      } else if (isNormal && !branchMatches) {
        // 잘못된 브랜치에서의 입력은 텍스트 일치 여부와 무관하게 브랜치 안내 우선.
        setHistory((prev) => [
          ...prev,
          { text: '브랜치를 이동해주세요! (hint: switch)', status: 'wrong-branch' },
        ]);
        applyTypoPenalty();
      } else {
        setHistory((prev) => [...prev, { text: inputValue, status: 'typo' }]);
        applyTypoPenalty();
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
      setHistory([]);
    };

    const handleMiss = () => {
      setInputValue('');
      setHistory((prev) => [...prev, { text: 'MISS!', status: 'miss' }]);
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
    history,
    isPlaying,
    activeBranch,
    handleInputChange,
    handleKeyDown,
  };
}
