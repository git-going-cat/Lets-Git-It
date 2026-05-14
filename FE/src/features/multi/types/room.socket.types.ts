/**
 * WebSocket 수신 메시지 타입 정의
 *
 * ⚠️  실제 payload 필드는 WebSocket 인프라 구현 담당자와 확인 후 조정 필요
 *
 * 구독 토픽:
 *   - /topic/room/{roomId}         → ROOM_STATE, PLAYER_JOINED, READY_CHANGED
 *   - /user/queue/private          → 개인 메시지 (추후 게임 시작 시 사용)
 */

import type { RoomMember, RoomState } from './room.types';

// ────────────────────────────────────────────────────────────
// 메시지 타입 식별자
// ────────────────────────────────────────────────────────────

export type RoomSocketMessageType = 'ROOM_STATE' | 'PLAYER_JOINED' | 'READY_CHANGED';

// ────────────────────────────────────────────────────────────
// 각 메시지 payload
// ────────────────────────────────────────────────────────────

/**
 * SUBSCRIBE /topic/room/{roomId} 직후 자동 수신
 * 방의 전체 현재 상태 스냅샷
 */
export interface RoomStateMessage {
  type: 'ROOM_STATE';
  roomState: RoomState;
  currentPlayers: number;
  members: RoomMember[];
}

/**
 * 다른 플레이어가 방에 입장했을 때 수신
 * allMembers로 멤버 목록 전체를 덮어씀
 */
export interface PlayerJoinedMessage {
  type: 'PLAYER_JOINED';
  allMembers: RoomMember[];
}

/**
 * 플레이어 준비 상태가 바뀌었을 때 수신
 * allMembers로 멤버 목록 전체를 덮어씀
 */
export interface ReadyChangedMessage {
  type: 'READY_CHANGED';
  allMembers: RoomMember[];
}

/** /topic/room/{roomId} 에서 수신 가능한 모든 메시지 union */
export type RoomTopicMessage = RoomStateMessage | PlayerJoinedMessage | ReadyChangedMessage;
