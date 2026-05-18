import { useCallback, useEffect, useRef } from 'react';

import { sendKeepAliveRequest } from '@/core/http';

import { leaveRoom } from '../api/room.api';

interface UseRoomExitGuardOptions {
  roomId: number | null | undefined;
  reset: () => void;
  shouldLeave?: () => boolean;
}

const pendingLeaveTimers = new Map<number, number>();

async function leaveRoomKeepAlive(roomId: number): Promise<void> {
  await sendKeepAliveRequest(`/api/v1/rooms/${roomId}/leave`, {
    method: 'DELETE',
  });
}

/**
 * 게임 화면에서 빠져나갈 때 방 퇴장을 best-effort로 보장하는 훅.
 *
 * - SPA 라우트 변경: 일반 `leaveRoom` 호출
 * - 탭 닫기 / 새로고침 / pagehide: `fetch(..., keepalive)`로 best-effort 전송
 * - 중복 호출은 roomId 단위로 한 번만 실행
 */
export function useRoomExitGuard({ roomId, reset, shouldLeave }: UseRoomExitGuardOptions) {
  const hasLeftRef = useRef(false);

  const leave = useCallback(
    async (bestEffort: boolean) => {
      if (roomId == null || roomId <= 0 || hasLeftRef.current) return;
      if (shouldLeave && !shouldLeave()) return;
      hasLeftRef.current = true;

      try {
        if (bestEffort) {
          await leaveRoomKeepAlive(roomId);
        } else {
          await leaveRoom(roomId);
        }
      } catch (error) {
        console.error('[RoomExitGuard] 방 나가기 실패:', error);
      } finally {
        reset();
      }
    },
    [reset, roomId, shouldLeave]
  );

  useEffect(() => {
    hasLeftRef.current = false;
    if (roomId == null) return;

    const pendingTimer = pendingLeaveTimers.get(roomId);
    if (pendingTimer === undefined) return;

    window.clearTimeout(pendingTimer);
    pendingLeaveTimers.delete(roomId);
  }, [roomId]);

  useEffect(() => {
    if (roomId == null || roomId <= 0) return;

    const handlePageHide = () => {
      void leave(true);
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      const timerId = window.setTimeout(() => {
        pendingLeaveTimers.delete(roomId);
        void leave(false);
      }, 100);
      pendingLeaveTimers.set(roomId, timerId);
    };
  }, [leave, roomId]);
}
