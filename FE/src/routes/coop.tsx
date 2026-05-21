import { createFileRoute } from '@tanstack/react-router';

import CoopPage from '@/features/coop/components/CoopPage';

export const Route = createFileRoute('/coop')({
  // TODO: BE 게임 세션/방 진입 플로우 확정 후 roomId 기반 coop 라우팅으로 확장합니다.
  component: CoopPage,
});
