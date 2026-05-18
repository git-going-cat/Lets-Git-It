/**
 * 방 대기실 WebSocket 메시지 핸들러
 *
 * ## 연동 방법 (WebSocket 인프라 담당자용)
 *
 * socketManager.subscribe를 통해 구독하고, 수신 콜백에서 아래 함수를 호출하세요.
 * stompClient를 직접 사용하지 마세요 — 모든 송수신은 socketManager 경유가 컨벤션입니다.
 *
 * ```ts
 * // 예시 — socketManager 사용 (컨벤션 준수)
 * socketManager.subscribe(`/topic/room/${roomId}`, (frame) => {
 *   handleRoomTopicMessage(JSON.parse(frame.body), useRoomStore.getState());
 * });
 * ```
 *
 * ## 구독 토픽 목록
 *   - /topic/room/{roomId}      → ROOM_STATE, PLAYER_JOINED, READY_CHANGED
 *   - /user/queue/private       → 개인 메시지 (게임 시작 이후 단계에서 사용)
 *
 * ## PUBLISH
 *   - /app/room/{roomId}/ready  → READY_UPDATE
 *   - /app/room/{roomId}/start  → GAME_START
 */

import { roomTopicMessageSchema } from '../schemas/room.schema';

import type { useRoomStore } from '../store/roomStore';
import type {
  ContributionRoomInfoUpdatedMessage,
  ContributionRoomStateMessage,
  CoopRoomInfoUpdatedMessage,
  CoopRoomStateMessage,
  HostDelegatedMessage,
  HostTransferredMessage,
  PlayerJoinedMessage,
  PlayerKickedMessage,
  PlayerLeftMessage,
  ReadyChangedMessage,
  RoomPrivateMessage,
  RoomTopicMessage,
} from '../types/room.socket.types';

type RoomStoreState = ReturnType<typeof useRoomStore.getState>;

// ────────────────────────────────────────────────────────────
// 핸들러
// ────────────────────────────────────────────────────────────

import { roomPrivateMessageSchema } from '../schemas/room.schema';

// /user/queue/private에서 수신되는 방 상태 스냅샷 메시지 핸들러
export function handleRoomPrivateMessage(
  raw: unknown,
  store: RoomStoreState
): RoomPrivateMessage | null {
  const result = roomPrivateMessageSchema.safeParse(raw);
  if (!result.success) {
    console.error('[WS] 개인 큐 방 상태 파싱 실패:', result.error);
    return null;
  }
  const msg = result.data;
  switch (msg.type) {
    case 'CONTRIBUTION_ROOM_STATE':
      handleContributionRoomState(msg, store);
      break;
    case 'COOP_ROOM_STATE':
      handleCoopRoomState(msg, store);
      break;
  }
  return msg;
}

/**
 * CONTRIBUTION_ROOM_STATE 처리 (재연결 복원)
 *
 * SUBSCRIBE /topic/room/{roomId} 직후 자동 수신.
 * 방의 전체 상태를 스토어에 복원합니다.
 */
export function handleContributionRoomState(
  msg: ContributionRoomStateMessage,
  store: RoomStoreState
): void {
  store.initFromContributionRoomState(msg);
}

/**
 * COOP_ROOM_STATE 처리 (재연결 복원)
 *
 * SUBSCRIBE /topic/room/{roomId} 직후 자동 수신.
 * 방의 전체 상태를 스토어에 복원합니다.
 */
export function handleCoopRoomState(msg: CoopRoomStateMessage, store: RoomStoreState): void {
  store.initFromCoopRoomState(msg);
}

/**
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
 * 변경된 플레이어의 준비 상태만 갱신하고 allReady는 서버 값을 따릅니다.
 */
export function handleReadyChanged(msg: ReadyChangedMessage, store: RoomStoreState): void {
  store.updateReady({
    playerId: msg.playerId,
    nickname: msg.nickname,
    isReady: msg.isReady,
    allReady: msg.allReady,
  });
}

/**
 * PLAYER_LEFT 처리
 *
 * 누군가 방을 나갔을 때 수신.
 * remainMembers로 전체 멤버 목록을 덮어씁니다.
 */
export function handlePlayerLeft(msg: PlayerLeftMessage, store: RoomStoreState): void {
  store.setMembers(msg.remainMembers);
}

/**
 * PLAYER_KICKED 처리
 *
 * 방장이 다른 플레이어를 추방했을 때 수신.
 * remainMembers로 전체 멤버 목록을 덮어씁니다.
 */
export function handlePlayerKicked(msg: PlayerKickedMessage, store: RoomStoreState): void {
  store.setMembers(msg.remainMembers);
}

/**
 * HOST_DELEGATED 처리
 *
 * 방장이 나가서 새 방장이 자동 위임되었을 때 수신.
 * remainMembers로 전체 멤버 목록을 덮어씁니다.
 */
export function handleHostDelegated(msg: HostDelegatedMessage, store: RoomStoreState): void {
  store.setMembers(msg.remainMembers);
}

/**
 * HOST_TRANSFERRED 처리
 *
 * 방장이 자발적으로 위임했을 때 수신.
 * allMembers로 전체 멤버 목록을 덮어씁니다.
 */
export function handleHostTransferred(msg: HostTransferredMessage, store: RoomStoreState): void {
  store.setMembers(msg.allMembers);
}

/**
 * CONTRIBUTION_ROOM_INFO_UPDATED 처리
 *
 * 방장이 REST 수정 API를 성공하면 서버가 최신 방 정보를 브로드캐스트합니다.
 */
export function handleContributionRoomInfoUpdated(
  msg: ContributionRoomInfoUpdatedMessage,
  store: RoomStoreState
): void {
  store.applyContributionRoomInfoUpdated(msg);
}

/**
 * COOP_ROOM_INFO_UPDATED 처리
 *
 * 방장이 REST 수정 API를 성공하면 서버가 최신 방 정보를 브로드캐스트합니다.
 */
export function handleCoopRoomInfoUpdated(
  msg: CoopRoomInfoUpdatedMessage,
  store: RoomStoreState
): void {
  store.applyCoopRoomInfoUpdated(msg);
}

/**
 * /topic/room/{roomId} 수신 raw 메시지를 검증 후 적절한 핸들러로 위임한다.
 *
 * WebSocket 구독 콜백에서 `JSON.parse(frame.body)` 결과를 그대로 전달하면 된다.
 * 스키마 검증 실패 시 에러 로그만 남기고 UI를 중단하지 않는다 (§3, §8 컨벤션).
 */
export function handleRoomTopicMessage(
  raw: unknown,
  store: RoomStoreState
): RoomTopicMessage | null {
  const result = roomTopicMessageSchema.safeParse(raw);
  if (!result.success) {
    console.error('[WS] 방 메시지 파싱 실패:', result.error);
    return null;
  }
  const msg = result.data;
  switch (msg.type) {
    case 'PLAYER_JOINED':
      handlePlayerJoined(msg, store);
      break;
    case 'READY_CHANGED':
      handleReadyChanged(msg, store);
      break;
    case 'PLAYER_LEFT':
      handlePlayerLeft(msg, store);
      break;
    case 'PLAYER_KICKED':
      handlePlayerKicked(msg, store);
      break;
    case 'HOST_DELEGATED':
      handleHostDelegated(msg, store);
      break;
    case 'HOST_TRANSFERRED':
      handleHostTransferred(msg, store);
      break;
    case 'CONTRIBUTION_ROOM_INFO_UPDATED':
      handleContributionRoomInfoUpdated(msg, store);
      break;
    case 'COOP_ROOM_INFO_UPDATED':
      handleCoopRoomInfoUpdated(msg, store);
      break;
  }
  return msg;
}
