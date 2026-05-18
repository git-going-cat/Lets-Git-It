import { useLayoutEffect } from 'react';
import { Provider } from 'jotai';

import { useRoomExitGuard } from '@/features/multi/hooks/useRoomExitGuard';

// TODO: WS 연동 완료 시 아래 두 import와 useLayoutEffect 블록 제거 후 sessionId 가드 복원
import { MOCK_CONTRIBUTION_STARTED, MOCK_MY_PLAYER_ID } from '../dev/mockSession';
import { useContributionStore } from '../store/contributionStore';

import ContributionGameContent from './ContributionGameContent';
import ResultModal from './ResultModal';

/**
 * 기여도 뺏기 게임 페이지.
 * WaitingRoom에서 게임 시작 신호를 받아 store가 세팅된 후 진입한다.
 */
export default function ContributionPage() {
  const roomId = useContributionStore((s) => s.roomId);
  const clearSession = useContributionStore((s) => s.clearSession);

  // TODO: WS 연동 완료 시 이 블록 제거
  useLayoutEffect(() => {
    const { sessionId, setSession } = useContributionStore.getState();
    if (sessionId) return;

    // 실제 WaitingRoom 핸들러가 하는 것과 동일한 변환 로직
    const { gameSessionId, initialBranch, commandSet, players } = MOCK_CONTRIBUTION_STARTED;
    const branches = [...new Set(commandSet.map((c) => c.branchName))];

    setSession({
      sessionId: gameSessionId,
      roomId: 0,
      myPlayerId: MOCK_MY_PLAYER_ID, // 실제: authStore.getState().user?.playerId
      commandSet,
      branches,
      players: players.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        currentBranch: initialBranch,
      })),
    });
  }, []);

  useRoomExitGuard({ roomId, reset: clearSession });

  return (
    <Provider>
      <ContributionGameContent />
      <ResultModal />
    </Provider>
  );
}
