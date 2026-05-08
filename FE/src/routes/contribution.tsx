import { createFileRoute } from '@tanstack/react-router';

import PreparingPage from '@/shared/components/PreparingPage';

export const Route = createFileRoute('/contribution')({
  component: () => <PreparingPage title="기여도 겨루기 준비 중" />,
});
