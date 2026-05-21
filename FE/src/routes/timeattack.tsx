import { createFileRoute } from '@tanstack/react-router';

import PreparingPage from '@/shared/components/PreparingPage';

export const Route = createFileRoute('/timeattack')({
  component: () => <PreparingPage title="타임어택 준비 중" />,
});
