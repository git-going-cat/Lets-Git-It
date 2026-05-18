import { createFileRoute } from '@tanstack/react-router';

import CoopPage from '@/features/coop/components/CoopPage';

export const Route = createFileRoute('/coop')({
  component: CoopPage,
});
