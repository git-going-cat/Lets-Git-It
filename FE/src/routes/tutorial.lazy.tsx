import { createLazyFileRoute } from '@tanstack/react-router';

import TutorialPage from '@/features/single/components/TutorialPage';

export const Route = createLazyFileRoute('/tutorial')({
  component: TutorialPage,
});
