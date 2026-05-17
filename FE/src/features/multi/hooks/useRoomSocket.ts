import { useCallback, useEffect, useRef, useState } from 'react';

import { socketManager } from '@/core/socket/SocketManager';
import { useAuthStore } from '@/features/auth/store/authStore';

import { getRoomState } from '../api/room.api';
import { handleRoomPrivateMessage, handleRoomTopicMessage } from '../handlers/roomSocketHandlers';
import {
  BaseMessageSchema,
  ErrorSchema,
  ForceDisconnectSchema,
  KickedSchema,
} from '../schemas/room.schema';
import { useRoomStore } from '../store/roomStore';

const topicKey = (roomId: number) => `room-topic-${roomId}`;
const PRIVATE_KEY = 'room-private';

const REST_FALLBACK_DELAY_MS = 3_000;
const RECONNECTED_BANNER_MS = 2_000;
const BLOCKING_ESCALATION_MS = 10_000;

/**
 * 연결 상태
 * - `idle`         — 정상 연결 중
 * - `disconnected` — 네트워크 단절 (노란 배너, 10초 이내)
 * - `reconnected`  — 방금 재연결 성공 (초록 배너, 2초 후 idle)
 * - `blocking`     — 복원 필요 오버레이 (페이지 새로고침 또는 10초+ 단절)
 */
export type RoomConnectionStatus = 'idle' | 'disconnected' | 'reconnected' | 'blocking';

type PrivateQueueHandlers = {
  onForceDisconnect?: () => void;
  onKicked?: (roomId: string) => void;
  onPrivateError?: (code: string, message: string) => void;
};

/**
 * 방 대기실 WebSocket 연결 · 구독을 관리한다.
 *
 * ## 재연결 흐름
 *
 * ### 페이지 새로고침
 * - store에 title이 없으면 `blocking` 상태로 시작
 * - 구독 직후 서버 자동 전송 `CONTRIBUTION/COOP_ROOM_STATE` 를 3초 대기
 * - 3초 내 미수신 시 REST fallback 호출
 * - 복원 후 `roomState === 'IN_GAME'`이면 `onReconnectComplete('IN_GAME')` 호출
 *
 * ### 네트워크 단절
 * - 단절 감지 즉시 `disconnected` 상태 (노란 배너)
 * - 10초 이내 복원: `reconnected` (초록 배너 2초) → `idle`
 * - 10초 초과: `blocking` 오버레이로 격상 + ROOM_STATE 재수신 대기
 */
export function useRoomSocket(
  roomId: number,
  onReconnectComplete?: (roomState: string | null) => void,
  privateQueueHandlers: PrivateQueueHandlers = {}
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
  useEffect(() => {
    onReconnectCompleteRef.current = onReconnectComplete;
  }, [onReconnectComplete]);
  useEffect(() => {
    privateQueueHandlersRef.current = privateQueueHandlers;
  }, [privateQueueHandlers]);

  // ROOM_STATE 복원이 필요한 상태인지 추적
  const needsRestoreRef = useRef(needsInitialRestore);
  const escalationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectedBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 최초 연결 완료 여부 (초기 connect 이전 disconnect 이벤트 무시용)
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
          if (!needsRestoreRef.current) return; // WS가 먼저 도착한 경우 race guard
          if (state.type === 'CONTRIBUTION_ROOM_STATE') {
            useRoomStore.getState().initFromContributionRoomState(state);
          } else {
            useRoomStore.getState().initFromCoopRoomState(state);
          }
          restoredRoomState = state.roomState;
        } catch {
          // 실패 — null로 onReconnectComplete 호출
        }
        needsRestoreRef.current = false;
        fallbackTimerRef.current = null;
        setConnectionStatus('idle');
        onReconnectCompleteRef.current?.(restoredRoomState); // null = 복원 실패
      })();
    }, REST_FALLBACK_DELAY_MS);
  }, [clearFallbackTimer, roomId]);

  // ── Effect 1: WS 구독 + 페이지 새로고침 REST fallback ──────────
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    socketManager.connect(token);

    // 1. 개인 큐를 먼저 구독 (ROOM_STATE 유니캐스트 수신)
    socketManager.subscribe(
      '/user/queue/private',
      (raw) => {
        const baseMessage = BaseMessageSchema.safeParse(raw);
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
            const result = ForceDisconnectSchema.safeParse(raw);
            if (!result.success) {
              console.error('[socket] Invalid FORCE_DISCONNECT packet dropped.', result.error);
              return;
            }
            socketManager.disconnect();
            privateQueueHandlersRef.current.onForceDisconnect?.();
            return;
          }

          case 'KICKED': {
            const result = KickedSchema.safeParse(raw);
            if (!result.success) {
              console.error('[socket] Invalid KICKED packet dropped.', result.error);
              return;
            }
            socketManager.disconnect();
            privateQueueHandlersRef.current.onKicked?.(result.data.roomId);
            return;
          }

          case 'ERROR': {
            const result = ErrorSchema.safeParse(raw);
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
            return;
        }
      },
      PRIVATE_KEY
    );

    // 2. 방 전체 topic은 트리거용으로 구독 (브로드캐스트 이벤트만)
    socketManager.subscribe(
      `/topic/room/${roomId}`,
      (raw) => {
        handleRoomTopicMessage(raw, useRoomStore.getState());
      },
      topicKey(roomId)
    );

    // REST fallback — 3초 내 WS ROOM_STATE 미수신 시
    if (needsRestoreRef.current) {
      scheduleRestFallback();
    }

    return () => {
      socketManager.unsubscribe(topicKey(roomId));
      socketManager.unsubscribe(PRIVATE_KEY);
      clearFallbackTimer();
      socketManager.disconnect(); // 컨벤션 §13: 방 완전 이탈 시 disconnect
    };
  }, [clearFallbackTimer, roomId, scheduleRestFallback]);

  // ── Effect 2: 네트워크 단절 / 재연결 감지 ──────────────────────
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
            // 초록 배너 2초 후 idle
            if (reconnectedBannerTimerRef.current) clearTimeout(reconnectedBannerTimerRef.current);
            reconnectedBannerTimerRef.current = setTimeout(() => {
              setConnectionStatus('idle');
            }, RECONNECTED_BANNER_MS);
            return 'reconnected';
          }
          // blocking(10초 격상)인 경우: ROOM_STATE 수신으로 처리 (needsRestoreRef)
          return prev;
        });
      } else {
        // disconnected
        if (!hasEverConnectedRef.current) return; // 초기 연결 전 무시
        if (needsRestoreRef.current) return; // 이미 blocking (새로고침)

        setConnectionStatus('disconnected');

        // 10초 후 blocking으로 격상
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

  const publishReady = () => socketManager.publish(`/app/room/${roomId}/ready`, {});

  const publishStart = () => socketManager.publish(`/app/room/${roomId}/start`, {});

  return { publishReady, publishStart, connectionStatus };
}
