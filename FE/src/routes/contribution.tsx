import { createFileRoute } from '@tanstack/react-router';

import ContributionPage from '@/features/contribution/components/ContributionPage';

export const Route = createFileRoute('/contribution')({
  component: ContributionPage,
});
