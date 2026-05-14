/**
 * 방 대기실 WebSocket 메시지 핸들러
 *
 * ## 연동 방법 (WebSocket 인프라 담당자용)
 *
 * STOMP 구독 콜백에서 메시지 타입에 따라 아래 함수를 호출하면 됩니다.
 *
 * ```ts
 * // 예시 — STOMP 구현체 내부에서
 * stompClient.subscribe(`/topic/room/${roomId}`, (frame) => {
 *   handleRoomTopicMessage(JSON.parse(frame.body), useRoomStore.getState());
 * });
 * ```
 *
 * ## 구독 토픽 목록
 *   - /topic/room/{roomId}      → ROOM_STATE, PLAYER_JOINED, READY_CHANGED
 *   - /user/queue/private       → 개인 메시지 (게임 시작 이후 단계에서 사용)
 *
 * ## PUBLISH
 *   - /app/room/{roomId}/ready  → 준비 상태 토글 (파라미터 없음)
 */

import { roomTopicMessageSchema } from '../schemas/room.schema';

import type { useRoomStore } from '../store/roomStore';
import type {
  PlayerJoinedMessage,
  ReadyChangedMessage,
  RoomStateMessage,
} from '../types/room.socket.types';

type RoomStoreState = ReturnType<typeof useRoomStore.getState>;

// ────────────────────────────────────────────────────────────
// 핸들러
// ────────────────────────────────────────────────────────────

/**
 * ROOM_STATE 처리
 *
 * SUBSCRIBE /topic/room/{roomId} 직후 자동 수신.
 * 방의 현재 상태를 스냅샷으로 덮어씁니다.
 */
export function handleRoomState(msg: RoomStateMessage, store: RoomStoreState): void {
  store.setRoomState(msg.roomState);
  store.setMembers(msg.members);
}

/**
 * PLAYER_JOINED 처리
 *
 * 다른 플레이어가 입장했을 때 수신.
 * allMembers로 전체 멤버 목록을 덮어씁니다.
 */
export function handlePlayerJoined(msg: PlayerJoinedMessage, store: RoomStoreState): void {
  store.setMembers(msg.allMembers);
}

/**
 * READY_CHANGED 처리
 *
 * 누군가 준비 상태를 변경했을 때 수신.
 * allMembers로 전체 멤버 목록을 덮어씁니다.
 */
export function handleReadyChanged(msg: ReadyChangedMessage, store: RoomStoreState): void {
  store.setMembers(msg.allMembers);
}

/**
 * /topic/room/{roomId} 수신 raw 메시지를 검증 후 적절한 핸들러로 위임한다.
 *
 * WebSocket 구독 콜백에서 `JSON.parse(frame.body)` 결과를 그대로 전달하면 된다.
 * 스키마 검증 실패 시 에러 로그만 남기고 UI를 중단하지 않는다 (§3, §8 컨벤션).
 */
export function handleRoomTopicMessage(raw: unknown, store: RoomStoreState): void {
  const result = roomTopicMessageSchema.safeParse(raw);
  if (!result.success) {
    console.error('[WS] 방 메시지 파싱 실패:', result.error);
    return;
  }
  const msg = result.data;
  switch (msg.type) {
    case 'ROOM_STATE':
      handleRoomState(msg, store);
      break;
    case 'PLAYER_JOINED':
      handlePlayerJoined(msg, store);
      break;
    case 'READY_CHANGED':
      handleReadyChanged(msg, store);
      break;
  }
}
