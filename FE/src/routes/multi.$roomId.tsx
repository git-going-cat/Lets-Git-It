import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import WaitingRoom from '@/features/multi/components/WaitingRoom';

export const Route = createFileRoute('/multi/$roomId')({
  validateSearch: z.object({
    fromGameResult: z.boolean().optional(),
  }),
  component: WaitingRoom,
});
