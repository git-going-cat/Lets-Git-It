import { useCallback, useEffect, useRef } from 'react';

import { sendKeepAliveRequest } from '@/core/http';

import { leaveRoom } from '../api/room.api';

interface UseRoomExitGuardOptions {
  roomId: number | null | undefined;
  reset: () => void;
  shouldLeave?: () => boolean;
}

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
 * - StrictMode 이중 실행: cleanup에서 setTimeout으로 지연 예약 후 remount 시 취소
 */
export function useRoomExitGuard({ roomId, reset, shouldLeave }: UseRoomExitGuardOptions) {
  const hasLeftRef = useRef(false);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // roomId 변경 시 guard 초기화 + 이전 leave 예약 취소
  useEffect(() => {
    hasLeftRef.current = false;
    if (leaveTimeoutRef.current !== null) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
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
      // setTimeout(0)으로 지연 예약: StrictMode fake-unmount 후 remount 시
      // roomId effect가 이 타이머를 취소하여 중복 leave 방지
      leaveTimeoutRef.current = setTimeout(() => {
        leaveTimeoutRef.current = null;
        void leave(false);
      }, 0);
    };
  }, [leave, roomId]);
}
