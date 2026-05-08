import { createLazyFileRoute } from '@tanstack/react-router';

import { HomePage } from '@/features/home/components/HomePage';

export const Route = createLazyFileRoute('/home')({
  component: HomePage,
});
