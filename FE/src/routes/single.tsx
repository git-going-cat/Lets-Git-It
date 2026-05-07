import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import SinglePage from '@/features/single/components/SinglePage';

import { DIFFICULTIES } from '@/features/single/types/single.types';

const searchSchema = z.object({
  difficulty: z.enum(DIFFICULTIES).optional(),
});

export const Route = createFileRoute('/single')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (!search.difficulty) throw redirect({ to: '/home' });
  },
  component: SinglePage,
});
