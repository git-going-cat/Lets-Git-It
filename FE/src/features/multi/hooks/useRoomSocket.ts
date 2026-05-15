import { useEffect, useRef, useState } from 'react';

import { socketManager } from '@/core/socket/SocketManager';
import { useAuthStore } from '@/features/auth/store/authStore';

import { getContributionRoomState, getCoopRoomState } from '../api/room.api';
import { handleRoomTopicMessage } from '../handlers/roomSocketHandlers';
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
  onReconnectComplete?: (roomState: string | null) => void
) {
  const isInitialReconnect = !useRoomStore.getState().title;

  const [connectionStatus, setConnectionStatus] = useState<RoomConnectionStatus>(() =>
    isInitialReconnect ? 'blocking' : 'idle'
  );

  const onReconnectCompleteRef = useRef(onReconnectComplete);
  useEffect(() => {
    onReconnectCompleteRef.current = onReconnectComplete;
  }, [onReconnectComplete]);

  // ROOM_STATE 복원이 필요한 상태인지 추적
  const needsRestoreRef = useRef(isInitialReconnect);
  const escalationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectedBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 최초 연결 완료 여부 (초기 connect 이전 disconnect 이벤트 무시용)
  const hasEverConnectedRef = useRef(false);

  // ── Effect 1: WS 구독 + 페이지 새로고침 REST fallback ──────────
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    socketManager.connect(token);

    socketManager.subscribe(
      `/topic/room/${roomId}`,
      (raw) => {
        // handleRoomTopicMessage가 safeParse 검증 후 반환 — null이면 파싱 실패(§3)
        const msg = handleRoomTopicMessage(raw, useRoomStore.getState());

        if (needsRestoreRef.current && msg !== null) {
          if (msg.type === 'CONTRIBUTION_ROOM_STATE' || msg.type === 'COOP_ROOM_STATE') {
            needsRestoreRef.current = false;
            setConnectionStatus('idle');
            const restoredRoomState = useRoomStore.getState().roomState ?? '';
            onReconnectCompleteRef.current?.(restoredRoomState);
          }
        }
      },
      topicKey(roomId)
    );

    socketManager.subscribe('/user/queue/private', () => {}, PRIVATE_KEY);

    // REST fallback — 3초 내 WS ROOM_STATE 미수신 시
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (needsRestoreRef.current) {
      fallbackTimer = setTimeout(() => {
        if (!needsRestoreRef.current) return;

        void (async () => {
          let restoredRoomState: string | null = null;
          try {
            const state = await getContributionRoomState(roomId);
            if (!needsRestoreRef.current) return; // WS가 먼저 도착한 경우 race guard
            useRoomStore.getState().initFromContributionRoomState(state);
            restoredRoomState = state.roomState;
          } catch {
            try {
              const state = await getCoopRoomState(roomId);
              if (!needsRestoreRef.current) return; // WS가 먼저 도착한 경우 race guard
              useRoomStore.getState().initFromCoopRoomState(state);
              restoredRoomState = state.roomState;
            } catch {
              // 둘 다 실패 — null로 onReconnectComplete 호출
            }
          }
          needsRestoreRef.current = false;
          setConnectionStatus('idle');
          onReconnectCompleteRef.current?.(restoredRoomState); // null = 복원 실패
        })();
      }, REST_FALLBACK_DELAY_MS);
    }

    return () => {
      socketManager.unsubscribe(topicKey(roomId));
      socketManager.unsubscribe(PRIVATE_KEY);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      socketManager.disconnect(); // 컨벤션 §13: 방 완전 이탈 시 disconnect
    };
  }, [roomId]);

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
        }, BLOCKING_ESCALATION_MS);
      }
    });

    return () => {
      removeListener();
      if (escalationTimerRef.current) clearTimeout(escalationTimerRef.current);
      if (reconnectedBannerTimerRef.current) clearTimeout(reconnectedBannerTimerRef.current);
    };
  }, []);

  const publishReady = () => socketManager.publish(`/app/room/${roomId}/ready`, {});

  const publishStart = () => socketManager.publish(`/app/room/${roomId}/start`, {});

  return { publishReady, publishStart, connectionStatus };
}
