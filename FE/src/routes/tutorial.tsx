import { createFileRoute, redirect } from '@tanstack/react-router';

import { useAuthStore } from '@/features/auth/store/authStore';
import TutorialPage from '@/features/single/components/TutorialPage';

export const Route = createFileRoute('/tutorial')({
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
    if (user?.onboardingStatus === 'TUTORIAL_DONE') {
      throw redirect({ to: '/home' });
    }
  },
  component: TutorialPage,
});
