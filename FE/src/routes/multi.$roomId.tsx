// TODO: import { WaitingRoomPage } from '@/features/multi/components/WaitingRoomPage'
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/multi/$roomId')({
  component: () => <div />,
});
