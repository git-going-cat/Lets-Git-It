/**
 * WebSocket 수신 메시지 타입 정의
 *
 * ⚠️  실제 payload 필드는 WebSocket 인프라 구현 담당자와 확인 후 조정 필요
 *
 * 구독 토픽:
 *   - /topic/room/{roomId}         → ROOM_STATE, PLAYER_JOINED, READY_CHANGED
 *   - /user/queue/private          → 개인 메시지 (추후 게임 시작 시 사용)
 */

import type { RoomMember, RoomState, SelectedMap } from './room.types';

// ────────────────────────────────────────────────────────────
// 메시지 타입 식별자
// ────────────────────────────────────────────────────────────

export type RoomSocketMessageType =
  | 'ROOM_STATE'
  | 'CONTRIBUTION_ROOM_STATE'
  | 'COOP_ROOM_STATE'
  | 'PLAYER_JOINED'
  | 'READY_CHANGED'
  | 'PLAYER_LEFT'
  | 'PLAYER_KICKED'
  | 'HOST_DELEGATED'
  | 'HOST_TRANSFERRED'
  | 'CONTRIBUTION_ROOM_INFO_UPDATED'
  | 'COOP_ROOM_INFO_UPDATED'
  | 'CHAT_RESPONSE';

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
  roomState: 'WAITING' | 'IN_GAME';
  joinedPlayer: RoomMember;
  allMembers: RoomMember[];
}

/**
 * 플레이어 준비 상태가 바뀌었을 때 수신
 * 변경된 플레이어만 patch하고 allReady는 서버 값을 따른다.
 */
export interface ReadyChangedMessage {
  type: 'READY_CHANGED';
  playerId: string;
  nickname: string;
  isReady: boolean;
  allReady: boolean;
}

/**
 * 플레이어가 방을 나갔을 때 수신
 * remainMembers로 멤버 목록을 덮어씀
 */
export interface PlayerLeftMessage {
  type: 'PLAYER_LEFT';
  leftPlayerId: string;
  leftPlayerNickname: string;
  remainMembers: RoomMember[];
}

/**
 * 플레이어가 방장에 의해 추방되었을 때 수신
 * remainMembers로 멤버 목록을 덮어씀
 */
export interface PlayerKickedMessage {
  type: 'PLAYER_KICKED';
  playerId: string;
  nickname: string;
  remainMembers: RoomMember[];
}

/**
 * 방장이 나가서 새 방장이 위임되었을 때 수신
 * remainMembers로 멤버 목록을 덮어씀
 */
export interface HostDelegatedMessage {
  type: 'HOST_DELEGATED';
  newHostId: string;
  newHostNickname: string;
  remainMembers: RoomMember[];
}

/**
 * 방장이 자발적으로 다른 플레이어에게 방장 권한을 넘겼을 때 수신
 * allMembers로 멤버 목록을 덮어씀
 */
export interface HostTransferredMessage {
  type: 'HOST_TRANSFERRED';
  newHostId: string;
  newHostNickname: string;
  allMembers: RoomMember[];
}

/**
 * SUBSCRIBE /topic/room/{roomId} 직후 자동 수신 (재연결 복원용 - 기여도뺏기)
 * 방의 전체 현재 상태 스냅샷
 */
export interface ContributionRoomStateMessage {
  type: 'CONTRIBUTION_ROOM_STATE';
  roomId: number;
  roomCode: string;
  title: string;
  mode: 'CONTRIBUTION';
  roomState: RoomState;
  currentPlayers: number;
  maxPlayers: number;
  hasPassword: boolean;
  members: RoomMember[];
}

/**
 * SUBSCRIBE /topic/room/{roomId} 직후 자동 수신 (재연결 복원용 - 협력)
 * 방의 전체 현재 상태 스냅샷
 */
export interface CoopRoomStateMessage {
  type: 'COOP_ROOM_STATE';
  roomId: number;
  roomCode: string;
  title: string;
  teamName: string;
  mode: 'COOP';
  roomState: RoomState;
  currentPlayers: number;
  maxPlayers: number;
  hasPassword: boolean;
  selectedMap: SelectedMap;
  members: RoomMember[];
}

export interface ContributionRoomInfoUpdatedMessage {
  type: 'CONTRIBUTION_ROOM_INFO_UPDATED';
  roomId: number;
  roomCode: string;
  title: string;
  mode: 'CONTRIBUTION';
  roomState: RoomState;
  currentPlayers: number;
  maxPlayers: number;
  hasPassword: boolean;
  members: RoomMember[];
}

export interface CoopRoomInfoUpdatedMessage {
  type: 'COOP_ROOM_INFO_UPDATED';
  roomId: number;
  roomCode: string;
  title: string;
  teamName: string;
  mode: 'COOP';
  roomState: RoomState;
  currentPlayers: number;
  maxPlayers: number;
  hasPassword: boolean;
  selectedMap: SelectedMap;
  members: RoomMember[];
}

export interface ChatResponseMessage {
  type: 'CHAT_RESPONSE';
  playerId: string;
  nickname: string;
  message: string;
  sentAt: number;
}

/**
 * /topic/room/{roomId} 에서 수신 가능한 모든 메시지 union (브로드캐스트 이벤트만)
 */
export type RoomTopicMessage =
  | PlayerJoinedMessage
  | ReadyChangedMessage
  | PlayerLeftMessage
  | PlayerKickedMessage
  | HostDelegatedMessage
  | HostTransferredMessage
  | ContributionRoomInfoUpdatedMessage
  | CoopRoomInfoUpdatedMessage
  | ChatResponseMessage;

/**
 * /user/queue/private 에서 수신 가능한 방 상태 스냅샷 메시지 union
 */
export type RoomPrivateMessage = ContributionRoomStateMessage | CoopRoomStateMessage;
