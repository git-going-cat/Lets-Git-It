import { createFileRoute } from '@tanstack/react-router';

import { RankingPage } from '@/features/ranking/components/RankingPage';

export const Route = createFileRoute('/ranking')({
  component: RankingPage,
});
