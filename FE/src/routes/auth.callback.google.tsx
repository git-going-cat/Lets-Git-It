import { createFileRoute } from '@tanstack/react-router';

import GoogleCallbackPage from '@/features/auth/components/GoogleCallbackPage';

export const Route = createFileRoute('/auth/callback/google')({
  component: GoogleCallbackPage,
});
