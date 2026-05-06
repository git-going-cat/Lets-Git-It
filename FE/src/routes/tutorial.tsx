import { createFileRoute } from '@tanstack/react-router';

import TutorialReplayPage from '@/features/auth/components/TutorialReplayPage';

export const Route = createFileRoute('/tutorial')({
  component: TutorialReplayPage,
});
