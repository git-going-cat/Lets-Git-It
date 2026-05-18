import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import LobbyPage from '@/features/multi/components/LobbyPage';

import type { GameMode } from '@/features/multi/types/room.types';

const searchSchema = z.object({
  mode: z.enum(['CONTRIBUTION', 'COOP']).optional(),
});

function MultiLobbyIndex() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  return <LobbyPage mode={mode! as GameMode} onClose={() => void navigate({ to: '/home' })} />;
}

export const Route = createFileRoute('/multi/')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (!search.mode) throw redirect({ to: '/home' });
  },
  component: MultiLobbyIndex,
});
