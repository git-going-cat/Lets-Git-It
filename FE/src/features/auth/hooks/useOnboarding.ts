import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { onboardingApi } from '../api/onboardingApi';
import { useAuthStore } from '../store/authStore';

import type { OnboardingStatus } from '../types/auth.types';
import type { OnboardingStep } from '../types/onboarding.types';

/** onboardingStatus 기반으로 시작 단계 결정 */
function resolveInitialStep(status: OnboardingStatus): OnboardingStep {
  switch (status) {
    case 'NICKNAME_SET_DONE':
      return 'character';
    case 'TUTORIAL_DONE':
      return 'completing';
    default:
      return 'intro';
  }
}

/**
 * 온보딩 전체 흐름을 관리하는 커스텀 훅.
 *
 * steps: intro → nickname → character → tutorial-prompt → (tutorial | completing)
 * onboardingStatus에 따라 중간 단계부터 재개 가능.
 */
export function useOnboarding() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [step, setStep] = useState<OnboardingStep>(() =>
    resolveInitialStep(user?.onboardingStatus ?? 'NONE')
  );

  const goToStep = useCallback((next: OnboardingStep) => {
    setStep(next);
  }, []);

  const { mutateAsync: completeTutorial } = useMutation({
    mutationFn: () => onboardingApi.completeTutorial(),
  });

  /**
   * 튜토리얼 완료 or 스킵 처리.
   * completeTutorial API 호출 후 홈으로 이동.
   */
  const finishOnboarding = useCallback(async () => {
    setStep('completing');
    await completeTutorial().catch(() => {
      // 이미 TUTORIAL_DONE인 경우 예외 발생 → 무시하고 홈으로 이동
    });
    await navigate({ to: '/home' });
  }, [completeTutorial, navigate]);

  return { step, goToStep, finishOnboarding, user };
}
