import { createFileRoute, redirect } from '@tanstack/react-router';

import OnboardingPage from '@/features/auth/components/OnboardingPage';
import { useAuthStore } from '@/features/auth/store/authStore';

export const Route = createFileRoute('/onboarding')({
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
    if (user?.onboardingStatus === 'TUTORIAL_DONE') {
      throw redirect({ to: '/home' });
    }
  },
  component: OnboardingPage,
});
