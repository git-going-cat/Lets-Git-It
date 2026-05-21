import { createFileRoute } from '@tanstack/react-router';

import HomeRedirect from '@/features/auth/components/HomeRedirect';

export const Route = createFileRoute('/')({
  component: HomeRedirect,
});
