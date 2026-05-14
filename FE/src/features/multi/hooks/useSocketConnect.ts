import { useEffect } from 'react';

import { socketManager } from '@/core/socket/SocketManager';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * 방 입장 시 WebSocket 연결/해제를 담당하는 공통 hook.
 * 대기실 담당자가 컴포넌트에서 useSocketConnect(roomId)만 호출하면 동작.
 *
 * - accessToken이 없으면 연결을 시도하지 않는다.
 * - roomId 또는 accessToken 변경 시 재연결한다 (disconnect → connect).
 * - 컴포넌트 언마운트 시 disconnect를 호출한다.
 *
 * @param roomId - 연결할 방 ID. 변경되면 재연결이 트리거된다.
 */
export function useSocketConnect(roomId: string): void {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    socketManager.connect(accessToken);

    return () => {
      socketManager.disconnect();
    };
  }, [roomId, accessToken]);
}
