import { useCoopStore } from '@/features/coop/store/coopStore';
import { useRoomExitGuard } from '@/features/multi/hooks/useRoomExitGuard';
import PreparingPage from '@/shared/components/PreparingPage';

export default function CoopPage() {
  const roomId = useCoopStore((s) => s.roomId);
  const clearSession = useCoopStore((s) => s.clearSession);

  useRoomExitGuard({ roomId, reset: clearSession });

  return <PreparingPage title="협동 모드 준비 중" />;
}
