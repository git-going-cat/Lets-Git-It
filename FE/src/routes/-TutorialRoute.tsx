import { useCallback } from 'react';
import { useSearch } from '@tanstack/react-router';

import { onboardingApi } from '@/features/auth/api/onboardingApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import TutorialPage from '@/features/single/components/TutorialPage';

export default function TutorialRoute() {
  const { replay } = useSearch({ from: '/tutorial' });

  const onFetchSteps = useCallback(() => onboardingApi.getTutorialSteps(), []);

  const onComplete = useCallback(async () => {
    const user = useAuthStore.getState().user;
    if (replay || user?.onboardingStatus === 'TUTORIAL_DONE') return;
    try {
      await onboardingApi.completeTutorial();
      if (user) {
        useAuthStore.getState().updateUser({ onboardingStatus: 'TUTORIAL_DONE' });
      }
    } catch {
      // 모든 에러 무시 — 가장 흔한 케이스는 이미 TUTORIAL_DONE이라 BE가 throw하는 경우이며,
      // 네트워크/5xx 실패도 사용자 흐름을 막지 않기 위해 silent fallthrough 후 navigate로 진행한다.
    }
  }, [replay]);

  return <TutorialPage onFetchSteps={onFetchSteps} onComplete={onComplete} />;
}
