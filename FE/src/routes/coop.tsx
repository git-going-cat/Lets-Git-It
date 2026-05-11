import { createFileRoute } from '@tanstack/react-router';

import PreparingPage from '@/shared/components/PreparingPage';

export const Route = createFileRoute('/coop')({
  component: () => <PreparingPage title="협동 모드 준비 중" />,
});
