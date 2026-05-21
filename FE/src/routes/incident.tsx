import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const ALLOWED_SCENARIOS = [0, 1, 4] as const;

const searchSchema = z.object({
  scenarioId: z.coerce
    .number()
    .int()
    .refine((n): n is 0 | 1 | 4 => (ALLOWED_SCENARIOS as readonly number[]).includes(n))
    .optional(),
});

export const Route = createFileRoute('/incident')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (search.scenarioId === undefined) throw redirect({ to: '/home' });
  },
});
