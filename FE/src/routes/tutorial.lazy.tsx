import { createLazyFileRoute } from '@tanstack/react-router';

import TutorialRoute from './-TutorialRoute';

export const Route = createLazyFileRoute('/tutorial')({
  component: TutorialRoute,
});
