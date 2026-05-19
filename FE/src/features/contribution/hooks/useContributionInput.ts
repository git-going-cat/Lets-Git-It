import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';

import { isSwitchCommand, parseSwitchTarget } from '@/shared/game/branchParser';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import { contributionBus } from '../bridge/contributionBus';
import { activeBranchAtom } from '../store/activeBranchAtom';
import { useContributionStore } from '../store/contributionStore';

import type { HistoryStatus } from '@/shared/components/CommandInput';

/**
 * 기여도 뺏기 입력 처리 훅.
 * - 모든 입력(switch 포함)을 BE로 전달하고, 응답 종류에 따라 history status를 결정한다.
 *   single과 동일: 정타='ok', 오타='typo', 잘못된 브랜치='wrong-branch' 고정 메시지, manual switch='switch'.
 * - 사용자 입력 텍스트는 ref 큐에 보관해 BE 응답 도착 시점에 그대로 표시한다.
 * - git switch target == activeBranch는 no-op (BE 호출 스킵, history만 push).
 */
export function useContributionInput() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const [activeBranch, setActiveBranch] = useAtom(activeBranchAtom);
  const myPlayerId = useContributionStore((s) => s.myPlayerId);

  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<{ text: string; status: HistoryStatus }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTextsRef = useRef<Map<string, string>>(new Map());

  const isPlaying = gameStatus === 'playing';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPlaying) return;
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // 현재 브랜치로의 switch는 BE 호출 없이 종료 — 위치 변화도 없으므로 no-op.
    if (isSwitchCommand(trimmed) && parseSwitchTarget(trimmed) === activeBranch) {
      setHistory((prev) => [...prev, { text: trimmed, status: 'switch' }]);
      setInputValue('');
      return;
    }

    const requestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    pendingTextsRef.current.set(requestId, trimmed);
    contributionBus.emit('command:submit', { text: trimmed, requestId });
    setInputValue('');
  };

  useEffect(() => {
    const handleFailed = ({ errorCode, requestId }: { errorCode: string; requestId: string }) => {
      const text = pendingTextsRef.current.get(requestId) ?? '';
      pendingTextsRef.current.delete(requestId);
      if (errorCode === 'INVALID_BRANCH') {
        setHistory((prev) => [...prev, { text: '잘못된 브랜치입니다!', status: 'wrong-branch' }]);
      } else if (errorCode === 'WRONG_COMMAND') {
        setHistory((prev) => [...prev, { text, status: 'typo' }]);
      } else {
        console.warn('[ContributionInput] unknown errorCode:', errorCode);
        setHistory((prev) => [...prev, { text, status: 'typo' }]);
      }
    };

    // BE 확정 switch — requestId로 제출 텍스트를 찾아 그대로 표시.
    // switch는 항상 단순 movement이므로 SCORE_UPDATE와 충돌할 일 없음.
    const handleSwitch = ({ branch, requestId }: { branch: string; requestId: string }) => {
      const text = pendingTextsRef.current.get(requestId) ?? '';
      pendingTextsRef.current.delete(requestId);
      if (text) {
        setHistory((prev) => [...prev, { text, status: 'switch' }]);
      }
      setActiveBranch(branch);
    };

    const handleScoreUpdate = ({
      winnerId,
      requestId,
    }: {
      winnerId: string;
      requestId: string;
    }) => {
      if (winnerId === myPlayerId) {
        const text = pendingTextsRef.current.get(requestId) ?? '';
        if (text) {
          setHistory((prev) => [...prev, { text, status: 'ok' }]);
        }
      }
      // 이 라운드의 요청만 삭제. 다른 in-flight 요청은 각자의 응답(command:failed 등)에서 처리됨.
      pendingTextsRef.current.delete(requestId);
    };

    const handleExpired = () => {
      setHistory((prev) => [...prev, { text: 'MISS!', status: 'miss' }]);
      pendingTextsRef.current.clear();
    };

    const handleGameEnd = () => {
      setInputValue('');
      setHistory([]);
      pendingTextsRef.current.clear();
    };

    const unsubs = [
      contributionBus.subscribe('command:failed', handleFailed),
      contributionBus.subscribe('branch:switch', handleSwitch),
      contributionBus.subscribe('score:update', handleScoreUpdate),
      contributionBus.subscribe('command:expired', handleExpired),
      contributionBus.subscribe('game:end', handleGameEnd),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [myPlayerId, setActiveBranch]);

  useEffect(() => {
    if (isPlaying && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPlaying]);

  return {
    inputRef,
    inputValue,
    history,
    isPlaying,
    isInputDisabled: !isPlaying,
    activeBranch,
    handleInputChange,
    handleKeyDown,
  };
}
