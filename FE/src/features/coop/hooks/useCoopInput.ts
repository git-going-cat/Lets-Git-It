import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';

import { socketManager } from '@/core/socket/SocketManager';

import { coopBus } from '../bridge/coopBus';
import { coopMyCommandAtom } from '../store/coopCommandsAtom';
import {
  coopCurrentOrderAtom,
  coopInputBlockedAtom,
  coopPhaseAtom,
  coopResetTargetPlayerIdAtom,
} from '../store/coopPhaseAtom';
import { coopPlayersAtom } from '../store/coopPlayersAtom';
import { useCoopStore } from '../store/coopStore';

const COOP_INPUT_DESTINATION_TODO = '/app/coop/input';
const COOP_RESET_DESTINATION_TODO = '/app/coop/reset';

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

/** 협력 모드 전용 커맨드 입력 훅입니다. */
export function useCoopInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const phase = useAtomValue(coopPhaseAtom);
  const currentOrder = useAtomValue(coopCurrentOrderAtom);
  const isInputBlocked = useAtomValue(coopInputBlockedAtom);
  const resetTargetPlayerId = useAtomValue(coopResetTargetPlayerIdAtom);
  const players = useAtomValue(coopPlayersAtom);
  const myCommand = useAtomValue(coopMyCommandAtom);
  const sessionId = useCoopStore((state) => state.sessionId);

  const me = players.find((player) => player.isMe) ?? null;
  const isMyTurn = phase === 'input' && me?.commandOrder === currentOrder;
  const isResetTarget = phase === 'reset_wait' && me?.playerId === resetTargetPlayerId;

  const isDisabled =
    (phase !== 'input' && phase !== 'reset_wait') ||
    (isInputBlocked && !isResetTarget) ||
    (!isMyTurn && phase === 'input');

  const placeholder = useMemo(() => {
    if (phase === 'reveal') return '명령어를 암기하세요...';
    if (phase === 'assign') return '명령어 배정 중...';
    if (phase === 'reset_wait' && !isResetTarget) return '다른 플레이어가 reset 중입니다...';
    if (isInputBlocked && !isResetTarget) return '입력이 차단되었습니다...';
    if (!isMyTurn && phase === 'input') return '다른 플레이어의 차례입니다';
    if (phase === 'reset_wait' && isResetTarget) return 'git reset 을 입력하세요...';
    return '명령어를 입력하세요';
  }, [isInputBlocked, isMyTurn, isResetTarget, phase]);

  const triggerShake = useCallback(() => {
    setIsShaking(false);
    window.setTimeout(() => setIsShaking(true), 0);
  }, []);

  useEffect(() => {
    return coopBus.subscribe('coop:input-wrong-shake', () => {
      setInputValue('');
      triggerShake();
      inputRef.current?.focus();
    });
  }, [triggerShake]);

  useEffect(() => {
    if (!isDisabled) inputRef.current?.focus();
  }, [isDisabled, phase, currentOrder]);

  const submitInput = () => {
    const value = inputValue.trim();
    if (!value || isDisabled) return;

    if (phase === 'reset_wait') {
      if (value !== 'git reset') {
        setInputValue('');
        triggerShake();
        return;
      }

      socketManager.publish(COOP_RESET_DESTINATION_TODO, {
        gameSessionId: sessionId,
        inputText: value,
        requestId: createRequestId(),
      });
      setInputValue('');
      return;
    }

    socketManager.publish(COOP_INPUT_DESTINATION_TODO, {
      gameSessionId: sessionId,
      inputText: value,
      requestId: createRequestId(),
    });
    setInputValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitInput();
  };

  return {
    inputRef,
    inputValue,
    isDisabled,
    isShaking,
    myCommand,
    placeholder,
    setInputValue,
    submitInput,
    handleKeyDown,
    setIsShaking,
  };
}
