import { createLazyFileRoute } from '@tanstack/react-router';

import SinglePage from '@/features/single/components/SinglePage';

export const Route = createLazyFileRoute('/single')({
  component: SinglePage,
});
