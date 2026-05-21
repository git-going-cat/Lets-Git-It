import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { isAxiosError } from 'axios';

import { onboardingApi } from '../api/onboardingApi';
import { useAuthStore } from '../store/authStore';

import type { OnboardingStatus } from '../types/auth.types';
import type { OnboardingStep } from '../types/onboarding.types';

/** onboardingStatus 기반으로 시작 단계 결정 */
function resolveInitialStep(status: OnboardingStatus): OnboardingStep {
  switch (status) {
    case 'NICKNAME_SET_DONE':
      // 닉네임+캐릭터 설정 완료 → 튜토리얼 여부 선택 단계부터 재개
      return 'tutorial-prompt';
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
  const updateUser = useAuthStore((s) => s.updateUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const [step, setStep] = useState<OnboardingStep>(() =>
    resolveInitialStep(user?.onboardingStatus ?? 'NONE')
  );
  const [completingNetworkError, setCompletingNetworkError] = useState(false);

  const goToStep = useCallback(
    (next: OnboardingStep) => {
      if (next === 'tutorial') {
        // 실제 게임 환경의 튜토리얼 페이지로 이동
        navigate({ to: '/tutorial', search: { replay: false } });
        return;
      }
      setStep(next);
    },
    [navigate]
  );

  const { mutateAsync: completeTutorial } = useMutation({
    mutationFn: () => onboardingApi.completeTutorial(),
  });

  /**
   * 튜토리얼 완료 or 스킵 처리.
   * completeTutorial API 호출 후 홈으로 이동.
   * - 401(토큰 만료): 인증 초기화 후 로그인 페이지로
   * - 네트워크 에러(응답 없음): completing 상태 유지 + 재시도 버튼 노출
   * - 기타(409 등, 이미 완료): 무시하고 홈으로 이동
   */
  const finishOnboarding = useCallback(async () => {
    setStep('completing');
    setCompletingNetworkError(false);
    try {
      await completeTutorial();
      updateUser({ onboardingStatus: 'TUTORIAL_DONE' });
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          // 토큰 만료 → 인증 초기화 후 로그인으로
          clearAuth();
          await navigate({ to: '/login' });
          return;
        }
        if (!error.response) {
          // 네트워크 에러 → completing 단계에 재시도 버튼 노출, throw 없이 처리
          setCompletingNetworkError(true);
          return;
        }
        // 그 외 서버 에러(409 이미 완료 등) → 무시하고 홈으로 이동
      }
    }
    await navigate({ to: '/home' });
  }, [clearAuth, completeTutorial, navigate, updateUser]);

  return { step, goToStep, finishOnboarding, completingNetworkError, user };
}
