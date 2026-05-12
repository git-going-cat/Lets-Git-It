import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { DIFFICULTIES } from '@/shared/types/game.types';

const searchSchema = z.object({
  difficulty: z.enum(DIFFICULTIES).optional(),
});

export const Route = createFileRoute('/single')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (!search.difficulty) throw redirect({ to: '/home' });
  },
});
