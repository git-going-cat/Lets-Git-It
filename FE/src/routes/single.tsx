import { createFileRoute } from '@tanstack/react-router';

import SinglePage from '@/features/single/components/SinglePage';

export const Route = createFileRoute('/single')({
  component: SinglePage,
});
