import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { socketManager } from '@/core/socket/SocketManager';

import { leaveRoom } from '../api/room.api';

import type { GameMode } from '../types/room.types';

interface UseLeaveRoomOptions {
  roomId: number;
  mode: GameMode | null | undefined;
  reset: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

/**
 * 방 나가기 로직과 뒤로가기 가로채기를 담당하는 훅.
 *
 * - handleLeave: API 호출 후 store reset + 로비 이동
 * - popstate 이벤트에 대해 자동으로 handleLeave를 등록/해제함
 */
export function useLeaveRoom({ roomId, mode, reset, navigate }: UseLeaveRoomOptions) {
  const handleLeave = useCallback(() => {
    void leaveRoom(roomId)
      .catch((err: unknown) => {
        console.error('[WaitingRoom] 방 나가기 API 실패:', err);
      })
      .finally(() => {
        socketManager.disconnect();
        reset();
        void navigate({ to: '/home', search: { lobby: mode ?? 'CONTRIBUTION' } });
      });
  }, [roomId, reset, navigate, mode]);

  // popstate 콜백은 클로저 갱신이 안 되므로 ref로 최신값 유지
  const handleLeaveRef = useRef(handleLeave);
  useEffect(() => {
    handleLeaveRef.current = handleLeave;
  }, [handleLeave]);

  useEffect(() => {
    // 뒤로가기 가로채기 — state 태그를 쓴 더미 entry 진입 후 popstate 감지
    history.pushState({ waitingRoomGuard: roomId }, '', window.location.href);
    const onPopState = () => {
      const state = history.state as Record<string, unknown> | null;
      if (state?.waitingRoomGuard !== roomId) return;
      handleLeaveRef.current();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      // 정상 unmount이지만 navigate가 아직 일어나지 않은 경우(StrictMode 등) 더미 entry 제거
      const state = history.state as Record<string, unknown> | null;
      if (state?.waitingRoomGuard === roomId) {
        history.back();
      }
    };
  }, [roomId]);

  return { handleLeave };
}
