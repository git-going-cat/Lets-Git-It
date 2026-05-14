import { createFileRoute, redirect, useNavigate, useSearch } from '@tanstack/react-router';
import { z } from 'zod';

import LobbyPage from '@/features/multi/components/LobbyPage';

import type { GameMode } from '@/features/multi/types/room.types';

const searchSchema = z.object({
  mode: z.enum(['CONTRIBUTION', 'COOP']).optional(),
});

/** /multi 라우트에서 LobbyPage를 URL 파라미터와 연결하는 래퍼 */
function MultiLobbyRoute() {
  const { mode } = useSearch({ from: '/multi' });
  const navigate = useNavigate();
  // mode는 beforeLoad에서 redirect 가드가 undefined를 차단하므로 항상 정의됨
  return <LobbyPage mode={mode! as GameMode} onClose={() => void navigate({ to: '/home' })} />;
}

export const Route = createFileRoute('/multi')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (!search.mode) throw redirect({ to: '/home' });
  },
  component: MultiLobbyRoute,
});
