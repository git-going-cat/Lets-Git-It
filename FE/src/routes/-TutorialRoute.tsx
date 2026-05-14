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
      // 이미 TUTORIAL_DONE인 경우 무시
    }
  }, [replay]);

  return <TutorialPage onFetchSteps={onFetchSteps} onComplete={onComplete} />;
}
