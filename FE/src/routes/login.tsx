import { createFileRoute } from '@tanstack/react-router';

import LandingPage from '@/features/auth/components/LandingPage';

export const Route = createFileRoute('/login')({
  component: LandingPage,
});
