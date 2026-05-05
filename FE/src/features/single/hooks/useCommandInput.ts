import { useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { EventBus } from '@/core/bridge/EventBus';

import { comboAtom } from '../store/comboAtom';
import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { gameStatusAtom } from '../store/gameStatusAtom';
import { useSingleStore } from '../store/singleStore';
import { totalAttemptsAtom, typoCountAtom } from '../store/typoAtom';

export function useCommandInput() {
  const commandIndex = useAtomValue(currentCommandIndexAtom);
  const gameStatus = useAtomValue(gameStatusAtom);
  const { commandSet } = useSingleStore();

  const setTypoCount = useSetAtom(typoCountAtom);
  const setTotalAttempts = useSetAtom(totalAttemptsAtom);
  const setCombo = useSetAtom(comboAtom);

  const [inputValue, setInputValue] = useState('');
  const [historyText, setHistoryText] = useState('');
  const [isError, setIsError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isPlaying = gameStatus === 'playing';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isPlaying) return;

    if (e.key === 'Enter') {
      e.preventDefault();

      const currentCommand = commandSet[commandIndex];
      if (!currentCommand) return;

      setTotalAttempts((prev) => prev + 1);
      setHistoryText(inputValue);

      if (inputValue.trim() === currentCommand.text) {
        // 안정성 확보를 위해 현재 Phaser의 인덱스를 우선시합니다.
        setIsError(false);
        EventBus.emit('command:complete', { index: commandIndex });
      } else {
        // 오타 시 콤보 리셋. 목숨 차감은 하지 않음 (miss 이벤트와 별개)
        setIsError(true);
        setCombo(0);
        setTypoCount((prev) => prev + 1);
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
