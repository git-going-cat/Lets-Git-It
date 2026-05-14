import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { MultiLobbyRoute } from '@/features/multi/components/MultiLobbyRoute';

const searchSchema = z.object({
  mode: z.enum(['CONTRIBUTION', 'COOP']).optional(),
});

export const Route = createFileRoute('/multi')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (!search.mode) throw redirect({ to: '/home' });
  },
  component: MultiLobbyRoute,
});
