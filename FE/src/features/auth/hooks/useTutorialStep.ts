import { useCallback, useEffect, useRef, useState } from 'react';

import { onboardingApi } from '../api/onboardingApi';

import type { TutorialStep } from '../types/onboarding.types';

/**
 * 튜토리얼 진행 단계의 상태와 핸들러를 제공합니다.
 *
 * - API에서 13단계 튜토리얼 데이터 로드
 * - 사용자 입력을 현재 명령어와 비교, 일치하면 다음 단계로 진행
 * - 마지막 명령어 완료 시 onComplete 호출
 */
export function useTutorialStep(onComplete: () => void) {
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [commandIndex, setCommandIndex] = useState(0);
  const [input, setInput] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    onboardingApi.getTutorialSteps().then((data) => {
      setSteps(data);
      setIsLoading(false);
    });
  }, []);

  const currentStep = steps[stepIndex] ?? null;
  const currentCommand = currentStep?.commands[commandIndex] ?? null;

  const isLastCommand =
    stepIndex === steps.length - 1 && commandIndex === (currentStep?.commands.length ?? 1) - 1;

  const submitInput = useCallback(() => {
    if (!currentCommand) return;

    if (input.trim() === currentCommand.command.trim()) {
      setIsError(false);
      setInput('');

      if (!isLastCommand) {
        const hasNextCommand = commandIndex < (currentStep?.commands.length ?? 1) - 1;
        if (hasNextCommand) {
          setCommandIndex((i) => i + 1);
        } else {
          setStepIndex((i) => i + 1);
          setCommandIndex(0);
        }
      } else {
        onCompleteRef.current();
      }
    } else {
      setIsError(true);
    }
  }, [input, currentCommand, commandIndex, currentStep, isLastCommand]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitInput();
    if (isError) setIsError(false);
  };

  return {
    steps,
    currentStep,
    currentCommand,
    stepIndex,
    commandIndex,
    input,
    setInput,
    isError,
    isLoading,
    isLastCommand,
    submitInput,
    handleKeyDown,
  };
}
