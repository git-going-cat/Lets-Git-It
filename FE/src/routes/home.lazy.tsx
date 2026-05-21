import { createLazyFileRoute } from '@tanstack/react-router';

import HomeRoute from './-HomeRoute';

export const Route = createLazyFileRoute('/home')({
  component: HomeRoute,
});
