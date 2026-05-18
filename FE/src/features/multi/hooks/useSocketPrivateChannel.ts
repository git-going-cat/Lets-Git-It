import { useEffect } from 'react';

import { socketManager } from '@/core/socket/SocketManager';
import {
  baseMessageSchema,
  errorSchema,
  forceDisconnectSchema,
  kickedSchema,
} from '@/features/multi/schemas/room.schema';

/**
 * 현재 미사용.
 *
 * 대기실에서는 useRoomSocket이 /user/queue/private 구독을 소유하며,
 * ROOM_STATE snapshot과 FORCE_DISCONNECT/KICKED/ERROR를 한 콜백에서 함께 라우팅한다.
 * 이 훅을 다시 사용할 때는 같은 private queue를 중복 구독하지 않도록
 * 구독 책임을 useRoomSocket에서 분리한 뒤 적용해야 한다.
 */
const PRIVATE_CHANNEL_DESTINATION = '/user/queue/private';
const PRIVATE_CHANNEL_SUBSCRIPTION_KEY = 'multi:private-channel';
const FORCE_DISCONNECT_NEW_LOGIN_CODES = new Set(['NEW_LOGIN', 'REPLACED_BY_NEW_LOGIN']);

type UseSocketPrivateChannelOptions = {
  onForceDisconnect: () => void;
  onKicked: (roomId: number) => void;
  onError?: (code: string, message: string) => void;
};

/**
 * WebSocket 개인 큐에서 내려오는 공통 이벤트를 처리한다.
 *
 * FORCE_DISCONNECT, KICKED, ERROR는 도메인 화면과 무관하게 동일한 방식으로
 * 처리해야 하므로 multi feature의 공통 hook에서 구독과 검증을 담당한다.
 */
export function useSocketPrivateChannel({
  onForceDisconnect,
  onKicked,
  onError,
}: UseSocketPrivateChannelOptions): void {
  useEffect(() => {
    socketManager.subscribe(
      PRIVATE_CHANNEL_DESTINATION,
      (message) => {
        const baseMessage = baseMessageSchema.safeParse(message);

        if (!baseMessage.success) {
          console.error('[socket] Invalid private channel packet dropped.', baseMessage.error);
          return;
        }

        switch (baseMessage.data.type) {
          case 'FORCE_DISCONNECT': {
            const result = forceDisconnectSchema.safeParse(message);

            if (!result.success) {
              console.error('[socket] Invalid FORCE_DISCONNECT packet dropped.', result.error);
              return;
            }

            if (!FORCE_DISCONNECT_NEW_LOGIN_CODES.has(result.data.code)) return;
            socketManager.disconnect();
            onForceDisconnect();
            return;
          }

          case 'KICKED': {
            const result = kickedSchema.safeParse(message);

            if (!result.success) {
              console.error('[socket] Invalid KICKED packet dropped.', result.error);
              return;
            }

            socketManager.disconnect();
            onKicked(result.data.roomId);
            return;
          }

          case 'ERROR': {
            const result = errorSchema.safeParse(message);

            if (!result.success) {
              console.error('[socket] Invalid ERROR packet dropped.', result.error);
              return;
            }

            console.error('[socket] Private channel error.', {
              code: result.data.code,
              message: result.data.message,
            });
            onError?.(result.data.code, result.data.message);
            return;
          }

          default:
            return;
        }
      },
      PRIVATE_CHANNEL_SUBSCRIPTION_KEY
    );

    return () => {
      socketManager.unsubscribe(PRIVATE_CHANNEL_SUBSCRIPTION_KEY);
    };
  }, [onError, onForceDisconnect, onKicked]);
}
