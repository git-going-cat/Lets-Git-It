import { createFileRoute } from '@tanstack/react-router';

import OnboardingPage from '@/features/auth/components/OnboardingPage';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});
