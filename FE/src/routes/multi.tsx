import { createFileRoute } from '@tanstack/react-router';

import PreparingPage from '@/shared/components/PreparingPage';

export const Route = createFileRoute('/multi')({
  component: () => <PreparingPage title="멀티 모드 준비 중" />,
});
