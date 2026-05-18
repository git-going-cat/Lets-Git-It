import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';

import { env } from '@/config/env';
import { socketManager } from '@/core/socket/SocketManager';

import { coopBus } from '../bridge/coopBus';
import { coopCommandsAtom, coopMyCommandAtom } from '../store/coopCommandsAtom';
import {
  coopCurrentOrderAtom,
  coopInputBlockedAtom,
  coopPhaseAtom,
  coopResetTargetPlayerIdAtom,
} from '../store/coopPhaseAtom';
import { coopPlayersAtom } from '../store/coopPlayersAtom';
import { useCoopStore } from '../store/coopStore';

import type { HistoryStatus } from '@/shared/components/CommandInput';

interface HistoryEntry {
  text: string;
  status: HistoryStatus;
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function useCoopInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTextsRef = useRef<Map<string, string>>(new Map());
  const inputValueRef = useRef('');
  const lastSubmittedTextRef = useRef<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const phase = useAtomValue(coopPhaseAtom);
  const currentOrder = useAtomValue(coopCurrentOrderAtom);
  const isInputBlocked = useAtomValue(coopInputBlockedAtom);
  const resetTargetPlayerId = useAtomValue(coopResetTargetPlayerIdAtom);
  const players = useAtomValue(coopPlayersAtom);
  const commands = useAtomValue(coopCommandsAtom);
  const myCommand = useAtomValue(coopMyCommandAtom);
  const roomId = useCoopStore((state) => state.roomId);

  const me = players.find((player) => player.isMe) ?? null;
  const isMyTurn = phase === 'input' && me?.commandOrder === currentOrder;
  const isResetTarget = phase === 'reset_wait' && me?.playerId === resetTargetPlayerId;

  const isDisabled =
    phase === 'waiting' ||
    phase === 'reveal' ||
    phase === 'assign' ||
    phase === 'ended' ||
    (phase === 'wrong' && !isResetTarget) ||
    (phase === 'reset_wait' && !isResetTarget) ||
    (isInputBlocked && phase !== 'input' && !isResetTarget);

  const placeholder = useMemo(() => {
    if (phase === 'reveal') return '명령어를 암기하세요...';
    if (phase === 'assign') return '명령어 배정 중...';
    if (phase === 'reset_wait' && !isResetTarget) return '다른 플레이어가 reset 중입니다...';
    if (isInputBlocked && !isResetTarget) return '입력이 차단되었습니다...';
    if (phase === 'reset_wait' && isResetTarget) return 'git reset 을 입력하세요...';
    if (!isMyTurn && phase === 'input') return '순서를 기억해 명령어를 입력하세요';
    return '명령어를 입력하세요';
  }, [isInputBlocked, isMyTurn, isResetTarget, phase]);

  const triggerShake = useCallback(() => {
    setIsShaking(false);
    window.setTimeout(() => setIsShaking(true), 0);
  }, []);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    return coopBus.subscribe('coop:input-wrong-shake', () => {
      const text = lastSubmittedTextRef.current ?? inputValueRef.current.trim();
      pendingTextsRef.current.clear();
      lastSubmittedTextRef.current = null;
      if (text) {
        setHistory((prev) => [...prev, { text, status: 'typo' }]);
      }
      setInputValue('');
      triggerShake();
      inputRef.current?.focus();
    });
  }, [triggerShake]);

  useEffect(() => {
    if (!isDisabled) inputRef.current?.focus();
  }, [currentOrder, isDisabled, phase]);

  const submitInput = () => {
    const value = inputValue.trim();
    if (!value || isDisabled) return;

    if (phase === 'reset_wait') {
      if (value !== 'git reset') {
        setHistory((prev) => [...prev, { text: value, status: 'typo' }]);
        setInputValue('');
        triggerShake();
        return;
      }

      const requestId = createRequestId();
      pendingTextsRef.current.set(requestId, value);
      lastSubmittedTextRef.current = value;
      if (env.MODE === 'development' && roomId == null) {
        coopBus.emit('coop:mock-reset');
        pendingTextsRef.current.delete(requestId);
        lastSubmittedTextRef.current = null;
        setHistory((prev) => [...prev, { text: value, status: 'switch' }]);
        setInputValue('');
        return;
      }

      socketManager.publish(`/app/room/${roomId}/coop/reset`, {
        type: 'COOP_RESET',
        inputText: value,
        requestId,
      });
      setHistory((prev) => [...prev, { text: value, status: 'switch' }]);
      setInputValue('');
      return;
    }

    const requestId = createRequestId();
    pendingTextsRef.current.set(requestId, value);
    lastSubmittedTextRef.current = value;

    if (env.MODE === 'development' && roomId == null) {
      if (value === myCommand) {
        coopBus.emit('coop:mock-input-correct');
        pendingTextsRef.current.delete(requestId);
        setHistory((prev) => [...prev, { text: value, status: 'switch' }]);
        setInputValue('');
        return;
      }

      if (commands.some((command) => command.commandText === value)) {
        coopBus.emit('coop:mock-order-wrong');
        pendingTextsRef.current.delete(requestId);
        lastSubmittedTextRef.current = null;
        return;
      }

      coopBus.emit('coop:input-wrong-shake');
      return;
    }

    socketManager.publish(`/app/room/${roomId}/coop/input`, {
      type: 'COOP_INPUT',
      inputText: value,
      requestId,
    });
    setHistory((prev) => [...prev, { text: value, status: 'switch' }]);
    setInputValue('');
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitInput();
  };

  return {
    inputRef,
    inputValue,
    history,
    isDisabled,
    isInputDisabled: isDisabled,
    isShaking,
    myCommand,
    placeholder,
    activeBranch: 'coop',
    handleInputChange,
    setInputValue,
    submitInput,
    handleKeyDown,
    setIsShaking,
  };
}
