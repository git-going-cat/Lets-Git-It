import { Provider } from 'jotai';

import { useRoomExitGuard } from '@/features/multi/hooks/useRoomExitGuard';

import { useContributionStore } from '../store/contributionStore';

import ContributionGameContent from './ContributionGameContent';
import ResultModal from './ResultModal';

/**
 * 기여도 뺏기 게임 페이지.
 * WaitingRoom에서 게임 시작 신호를 받아 store가 세팅된 후 진입한다.
 */
export default function ContributionPage() {
  const roomId = useContributionStore((s) => s.roomId);
  const sessionId = useContributionStore((s) => s.sessionId);
  const clearSession = useContributionStore((s) => s.clearSession);

  useRoomExitGuard({ roomId, reset: clearSession });

  if (!sessionId) return null;

  return (
    <Provider>
      <ContributionGameContent />
      <ResultModal />
    </Provider>
  );
}
