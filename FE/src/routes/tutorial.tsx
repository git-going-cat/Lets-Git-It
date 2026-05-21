import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { useAuthStore } from '@/features/auth/store/authStore';

const searchSchema = z.object({
  replay: z.preprocess((value) => value === true || value === 'true', z.boolean()).catch(false),
});

export const Route = createFileRoute('/tutorial')({
  validateSearch: searchSchema,
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
});
