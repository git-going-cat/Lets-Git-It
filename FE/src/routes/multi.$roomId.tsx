import { createFileRoute } from '@tanstack/react-router';

import WaitingRoom from '@/features/multi/components/WaitingRoom';

export const Route = createFileRoute('/multi/$roomId')({
  component: WaitingRoom,
});
