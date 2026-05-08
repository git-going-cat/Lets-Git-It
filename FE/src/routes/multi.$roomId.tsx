import { createFileRoute } from '@tanstack/react-router';

import PreparingPage from '@/shared/components/PreparingPage';

export const Route = createFileRoute('/multi/$roomId')({
  component: () => <PreparingPage title="멀티 대기방 준비 중" />,
});
