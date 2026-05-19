import { useCallback, useEffect, useRef, useState } from 'react';

import { socketManager } from '@/core/socket/SocketManager';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCoopStore } from '@/features/coop/store/coopStore';

import { getRoomState } from '../api/room.api';
import { handleRoomPrivateMessage, handleRoomTopicMessage } from '../handlers/roomSocketHandlers';
import {
  baseMessageSchema,
  contributionStartedSchema,
  coopStartedSchema,
  errorSchema,
  forceDisconnectSchema,
  kickedSchema,
} from '../schemas/room.schema';
import { useRoomStore } from '../store/roomStore';

import type { ContributionStartedMessage, CoopStartedMessage } from '../schemas/room.schema';

const topicKey = (roomId: number) => `room-topic-${roomId}`;
const contributionGameKey = (roomId: number) => `room-contribution-start-${roomId}`;
const coopGameKey = (roomId: number) => `room-coop-start-${roomId}`;
const PRIVATE_KEY = 'room-private';

const REST_FALLBACK_DELAY_MS = 3_000;
const RECONNECTED_BANNER_MS = 2_000;
const BLOCKING_ESCALATION_MS = 10_000;
const FORCE_DISCONNECT_CODES = new Set(['LOGGED_OUT', 'REPLACED_BY_NEW_LOGIN']);
const COOP_RUNTIME_MESSAGE_TYPES = new Set([
  'COOP_ROUND_REVEAL',
  'COOP_ROUND_ASSIGN',
  'COOP_INPUT_WRONG',
  'COOP_RESET_WRONG',
  'COOP_ORDER_WRONG',
  'COOP_INPUT_CORRECT',
  'COOP_GAME_END',
]);

function getMessageType(message: unknown) {
  if (typeof message !== 'object' || message === null || !('type' in message)) return null;
  return typeof message.type === 'string' ? message.type : null;
}

/**
 * 대기실 WebSocket 연결 상태.
 * - `idle`: 정상 연결 또는 복원 완료
 * - `disconnected`: 네트워크 단절 감지 상태
 * - `reconnected`: 재연결 성공 배너 표시 상태
 * - `blocking`: ROOM_STATE 복원이 필요한 차단 상태
 */
export type RoomConnectionStatus = 'idle' | 'disconnected' | 'reconnected' | 'blocking';

type PrivateQueueHandlers = {
  onForceDisconnect?: () => void;
  onKicked?: (roomId: number) => void;
  onPrivateError?: (code: string, message: string) => void;
};

type GameStartHandlers = {
  onContributionStarted?: (message: ContributionStartedMessage) => void;
  onCoopStarted?: (message: CoopStartedMessage) => void;
};

/**
 * 대기실 WebSocket 연결과 구독을 관리한다.
 *
 * 새로고침/409 재진입처럼 store 복원이 필요한 경우 ROOM_STATE를 기다리고,
 * 일정 시간 안에 수신되지 않으면 REST fallback으로 방 상태를 복원한다.
 * 네트워크 단절이 길어지면 blocking 상태로 전환해 사용자에게 복원 대기 UI를 보여준다.
 */
export function useRoomSocket(
  roomId: number,
  onReconnectComplete?: (roomState: string | null) => void,
  privateQueueHandlers: PrivateQueueHandlers = {},
  gameStartHandlers: GameStartHandlers = {}
) {
  const initialRoomState = useRoomStore.getState();
  const isPreviewReconnect =
    initialRoomState.roomId === roomId &&
    Boolean(initialRoomState.title) &&
    initialRoomState.roomCode === null &&
    initialRoomState.maxPlayers === 0;
  const needsInitialRestore = !initialRoomState.title || isPreviewReconnect;

  const [connectionStatus, setConnectionStatus] = useState<RoomConnectionStatus>(() =>
    needsInitialRestore ? 'blocking' : 'idle'
  );

  const onReconnectCompleteRef = useRef(onReconnectComplete);
  const privateQueueHandlersRef = useRef(privateQueueHandlers);
  const gameStartHandlersRef = useRef(gameStartHandlers);
  useEffect(() => {
    onReconnectCompleteRef.current = onReconnectComplete;
  }, [onReconnectComplete]);
  useEffect(() => {
    privateQueueHandlersRef.current = privateQueueHandlers;
  }, [privateQueueHandlers]);
  useEffect(() => {
    gameStartHandlersRef.current = gameStartHandlers;
  }, [gameStartHandlers]);

  // ROOM_STATE 복원이 필요한 상태인지 추적한다.
  const needsRestoreRef = useRef(needsInitialRestore);
  const escalationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectedBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 최초 연결 완료 여부. 초기 connect 전 disconnect 이벤트를 무시하는 데 사용한다.
  const hasEverConnectedRef = useRef(false);

  const clearFallbackTimer = useCallback(() => {
    if (!fallbackTimerRef.current) return;
    clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
  }, []);

  const scheduleRestFallback = useCallback(() => {
    clearFallbackTimer();
    fallbackTimerRef.current = setTimeout(() => {
      if (!needsRestoreRef.current) return;

      void (async () => {
        let restoredRoomState: string | null = null;
        try {
          const state = await getRoomState(roomId);
          if (!needsRestoreRef.current) return; // WS가 먼저 복원한 경우 race guard
          if (state.type === 'CONTRIBUTION_ROOM_STATE') {
            useRoomStore.getState().initFromContributionRoomState(state);
          } else {
            useRoomStore.getState().initFromCoopRoomState(state);
          }
          restoredRoomState = state.roomState;
        } catch {
          // 실패 시 null로 onReconnectComplete 호출
        }
        needsRestoreRef.current = false;
        fallbackTimerRef.current = null;
        setConnectionStatus('idle');
        onReconnectCompleteRef.current?.(restoredRoomState); // null = 복원 실패
      })();
    }, REST_FALLBACK_DELAY_MS);
  }, [clearFallbackTimer, roomId]);

  // Effect 1: WS 구독 + 새로고침 REST fallback
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    socketManager.connect(token);

    // 1. 개인 큐를 먼저 구독한다. ROOM_STATE 유니캐스트와 개인 이벤트를 처리한다.
    socketManager.subscribe(
      '/user/queue/private',
      (raw) => {
        const baseMessage = baseMessageSchema.safeParse(raw);
        if (!baseMessage.success) {
          console.error('[WS] 개인 큐 메시지 파싱 실패:', baseMessage.error);
          return;
        }

        switch (baseMessage.data.type) {
          case 'CONTRIBUTION_ROOM_STATE':
          case 'COOP_ROOM_STATE': {
            const msg = handleRoomPrivateMessage(raw, useRoomStore.getState());
            if (needsRestoreRef.current && msg !== null) {
              needsRestoreRef.current = false;
              clearFallbackTimer();
              setConnectionStatus('idle');
              const restoredRoomState = useRoomStore.getState().roomState ?? '';
              onReconnectCompleteRef.current?.(restoredRoomState);
            }
            return;
          }

          case 'FORCE_DISCONNECT': {
            const result = forceDisconnectSchema.safeParse(raw);
            if (!result.success) {
              console.error('[socket] Invalid FORCE_DISCONNECT packet dropped.', result.error);
              return;
            }
            if (!FORCE_DISCONNECT_CODES.has(result.data.code)) return;
            socketManager.disconnect();
            privateQueueHandlersRef.current.onForceDisconnect?.();
            return;
          }

          case 'KICKED': {
            const result = kickedSchema.safeParse(raw);
            if (!result.success) {
              console.error('[socket] Invalid KICKED packet dropped.', result.error);
              return;
            }
            socketManager.disconnect();
            privateQueueHandlersRef.current.onKicked?.(result.data.roomId);
            return;
          }

          case 'ERROR': {
            const result = errorSchema.safeParse(raw);
            if (!result.success) {
              console.error('[socket] Invalid ERROR packet dropped.', result.error);
              return;
            }
            console.error('[socket] Private channel error.', {
              code: result.data.code,
              message: result.data.message,
            });
            privateQueueHandlersRef.current.onPrivateError?.(result.data.code, result.data.message);
            return;
          }

          default:
            if (COOP_RUNTIME_MESSAGE_TYPES.has(baseMessage.data.type)) {
              useCoopStore.getState().enqueuePendingMessage(raw);
            }
            return;
        }
      },
      PRIVATE_KEY
    );

    // 2. 방 전체 topic은 브로드캐스트 이벤트를 처리한다.
    socketManager.subscribe(
      `/topic/room/${roomId}`,
      (raw) => {
        handleRoomTopicMessage(raw, useRoomStore.getState());
      },
      topicKey(roomId)
    );

    // 새로고침 직후엔 mode가 null일 수 있다(ROOM_STATE 수신 전).
    // Effect deps에 mode가 없어 mount 시 1회만 실행되므로, 의도적으로 negative 조건을 써서
    // mode를 모를 때 두 토픽을 방어적으로 구독한다. positive(===)로 바꾸면 mode 세팅~재구독
    // 사이 윈도우에 GAME_STARTED를 놓칠 수 있어, 잉여 구독 1개를 감수하는 편이 더 안전하다.
    const mode = useRoomStore.getState().mode;

    if (mode !== 'COOP') {
      socketManager.subscribe(
        `/topic/room/${roomId}/contribution`,
        (raw) => {
          const result = contributionStartedSchema.safeParse(raw);
          if (!result.success) {
            console.error('[WS] CONTRIBUTION_STARTED 파싱 실패:', result.error);
            return;
          }
          needsRestoreRef.current = false;
          clearFallbackTimer();
          setConnectionStatus('idle');
          gameStartHandlersRef.current.onContributionStarted?.(result.data);
        },
        contributionGameKey(roomId)
      );
    }

    if (mode !== 'CONTRIBUTION') {
      socketManager.subscribe(
        `/topic/room/${roomId}/coop`,
        (raw) => {
          const messageType = getMessageType(raw);
          if (messageType !== 'COOP_STARTED' && COOP_RUNTIME_MESSAGE_TYPES.has(messageType ?? '')) {
            useCoopStore.getState().enqueuePendingMessage(raw);
            return;
          }

          const result = coopStartedSchema.safeParse(raw);
          if (!result.success) {
            console.error('[WS] COOP_STARTED 파싱 실패:', result.error);
            return;
          }
          needsRestoreRef.current = false;
          clearFallbackTimer();
          setConnectionStatus('idle');
          gameStartHandlersRef.current.onCoopStarted?.(result.data);
        },
        coopGameKey(roomId)
      );
    }

    // REST fallback: WS ROOM_STATE가 필요한 복원 상황에서만 실행한다.
    if (needsRestoreRef.current) {
      scheduleRestFallback();
    }

    return () => {
      socketManager.unsubscribe(topicKey(roomId));
      socketManager.unsubscribe(contributionGameKey(roomId));
      socketManager.unsubscribe(coopGameKey(roomId));
      socketManager.unsubscribe(PRIVATE_KEY);
      clearFallbackTimer();
    };
  }, [clearFallbackTimer, roomId, scheduleRestFallback]);

  // Effect 2: 네트워크 단절 / 재연결 감지
  useEffect(() => {
    const removeListener = socketManager.addConnectionListener((event) => {
      if (event === 'connected') {
        hasEverConnectedRef.current = true;

        // 격상 타이머 취소
        if (escalationTimerRef.current) {
          clearTimeout(escalationTimerRef.current);
          escalationTimerRef.current = null;
        }

        setConnectionStatus((prev) => {
          if (prev === 'disconnected') {
            // 재연결 배너를 잠시 보여준 뒤 idle로 복귀한다.
            if (reconnectedBannerTimerRef.current) clearTimeout(reconnectedBannerTimerRef.current);
            reconnectedBannerTimerRef.current = setTimeout(() => {
              setConnectionStatus('idle');
            }, RECONNECTED_BANNER_MS);
            return 'reconnected';
          }
          // blocking 상태는 ROOM_STATE 수신 또는 REST fallback으로 처리한다.
          return prev;
        });
      } else {
        // disconnected
        if (!hasEverConnectedRef.current) return; // 초기 연결 전 이벤트는 무시
        if (needsRestoreRef.current) return; // 이미 blocking 또는 복원 대기 중

        setConnectionStatus('disconnected');

        // 10초 이상 단절되면 blocking으로 격상한다.
        if (escalationTimerRef.current) clearTimeout(escalationTimerRef.current);
        escalationTimerRef.current = setTimeout(() => {
          needsRestoreRef.current = true;
          setConnectionStatus('blocking');
          scheduleRestFallback();
        }, BLOCKING_ESCALATION_MS);
      }
    });

    return () => {
      removeListener();
      if (escalationTimerRef.current) clearTimeout(escalationTimerRef.current);
      clearFallbackTimer();
      if (reconnectedBannerTimerRef.current) clearTimeout(reconnectedBannerTimerRef.current);
    };
  }, [clearFallbackTimer, scheduleRestFallback]);

  const publishReady = (isReady: boolean) =>
    socketManager.publish(`/app/room/${roomId}/ready`, {
      type: 'READY_UPDATE',
      isReady,
    });

  const publishStart = () =>
    socketManager.publish(`/app/room/${roomId}/start`, {
      type: 'GAME_START',
    });

  const publishHostTransfer = (nextHostId: string) =>
    socketManager.publish(`/app/room/${roomId}/transfer-host`, {
      type: 'HOST_TRANSFER_REQUEST',
      nextHostId,
    });

  const publishChat = (message: string) =>
    socketManager.publish(`/app/room/${roomId}/chat`, {
      type: 'CHAT_REQUEST',
      message,
    });

  return { publishReady, publishStart, publishHostTransfer, publishChat, connectionStatus };
}
