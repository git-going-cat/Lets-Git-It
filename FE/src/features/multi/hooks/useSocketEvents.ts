import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { socketManager } from '@/core/socket/SocketManager';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  BaseMessageSchema,
  ErrorSchema,
  ForceDisconnectSchema,
  KickedSchema,
} from '@/features/multi/schemas/room.schema';

const PRIVATE_CHANNEL_DESTINATION = '/user/queue/private';

// useSocketPrivateChannel의 'multi:private-channel' 키와 충돌하지 않도록 별도 키 사용.
const PRIVATE_CHANNEL_KEY = 'multi:waiting-room:private';

function resolveForceDisconnectMessage(code: string): string {
  switch (code) {
    case 'LOGGED_OUT':
      return '로그아웃으로 연결이 종료되었습니다.';
    case 'TOKEN_REISSUED':
      return '토큰 재발급으로 연결이 종료되었습니다. 다시 로그인해주세요.';
    case 'REPLACED_BY_NEW_LOGIN':
      return '다른 기기에서 로그인되어 연결이 종료되었습니다.';
    default:
      return '연결이 종료되었습니다.';
  }
}

/**
 * 대기실 전용 WebSocket 개인 채널(/user/queue/private) 이벤트 처리 hook.
 *
 * - FORCE_DISCONNECT: 연결 해제 → 인증 초기화 → /login 이동
 * - KICKED: /home 이동 (강퇴 UI 안내는 대기실 담당자 영역)
 * - ERROR: 에러 로그 출력, ROOM_NOT_FOUND이면 /home 이동
 *
 * useSocketConnect(roomId)와 함께 대기실 컴포넌트 최상단에서 호출한다.
 */
export function useSocketEvents(): void {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  useEffect(() => {
    socketManager.subscribe(
      PRIVATE_CHANNEL_DESTINATION,
      (message) => {
        const base = BaseMessageSchema.safeParse(message);

        if (!base.success) {
          console.error('[socket] Invalid private channel packet dropped.', base.error);
          return;
        }

        switch (base.data.type) {
          case 'FORCE_DISCONNECT': {
            const result = ForceDisconnectSchema.safeParse(message);

            if (!result.success) {
              console.error('[socket] Invalid FORCE_DISCONNECT packet dropped.', result.error);
              return;
            }

            socketManager.disconnect();
            clearAuth();

            // TODO: 대기실 담당자 — 아래 userMessage를 toast 등으로 사용자에게 표시하세요.
            const userMessage = resolveForceDisconnectMessage(result.data.code);
            console.warn('[socket] FORCE_DISCONNECT', result.data.code, userMessage);

            void navigate({ to: '/login' });
            return;
          }

          case 'KICKED': {
            const result = KickedSchema.safeParse(message);

            if (!result.success) {
              console.error('[socket] Invalid KICKED packet dropped.', result.error);
              return;
            }

            // TODO: 대기실 담당자 — 강퇴 안내(toast 등)를 표시한 뒤 navigate를 호출하거나,
            //       navigate 전에 UI 처리를 추가해 주세요.
            void navigate({ to: '/home' });
            return;
          }

          case 'ERROR': {
            const result = ErrorSchema.safeParse(message);

            if (!result.success) {
              console.error('[socket] Invalid ERROR packet dropped.', result.error);
              return;
            }

            console.error('[WS ERROR]', result.data.code, result.data.message);

            if (result.data.code === 'ROOM_NOT_FOUND') {
              void navigate({ to: '/home' });
            }

            return;
          }

          default:
            return;
        }
      },
      PRIVATE_CHANNEL_KEY
    );

    return () => {
      socketManager.unsubscribe(PRIVATE_CHANNEL_KEY);
    };
  }, [clearAuth, navigate]);
}
