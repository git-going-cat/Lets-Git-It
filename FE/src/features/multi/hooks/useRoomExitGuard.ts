import { useCallback, useEffect, useRef } from 'react';

import { env } from '@/config/env';
import { useAuthStore } from '@/features/auth/store/authStore';

import { leaveRoom } from '../api/room.api';

interface UseRoomExitGuardOptions {
  roomId: number | null | undefined;
  reset: () => void;
}

async function leaveRoomKeepAlive(roomId: number): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  await fetch(`${env.API_BASE_URL}/api/v1/rooms/${roomId}/leave`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
    keepalive: true,
  });
}

/**
 * 게임 화면에서 빠져나갈 때 방 퇴장을 best-effort로 보장하는 훅.
 *
 * - SPA 라우트 변경: 일반 `leaveRoom` 호출
 * - 탭 닫기 / 새로고침 / pagehide: `fetch(..., keepalive)`로 best-effort 전송
 * - 중복 호출은 roomId 단위로 한 번만 실행
 */
export function useRoomExitGuard({ roomId, reset }: UseRoomExitGuardOptions) {
  const hasLeftRef = useRef(false);

  const leave = useCallback(
    async (bestEffort: boolean) => {
      if (roomId == null || roomId <= 0 || hasLeftRef.current) return;
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
    [reset, roomId]
  );

  useEffect(() => {
    hasLeftRef.current = false;
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
      void leave(false);
    };
  }, [leave, roomId]);
}
