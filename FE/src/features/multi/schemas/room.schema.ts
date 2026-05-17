import { z } from 'zod';

// ── REST API 스키마 ────────────────────────────────────────────────
const gameModeSchema = z.enum(['CONTRIBUTION', 'COOP']);
const roomStateSchema = z.enum(['WAITING', 'IN_GAME']);

export const roomSummarySchema = z.object({
  roomId: z.number(),
  title: z.string(),
  mode: gameModeSchema,
  currentPlayers: z.number(),
  maxPlayers: z.number(),
  hasPassword: z.boolean(),
  roomState: roomStateSchema,
});

export const roomListResponseSchema = z.object({
  rooms: z.array(roomSummarySchema),
});

export const coopMapSchema = z.object({
  mapId: z.string(),
  mapName: z.string(),
  difficulty: z.number(),
  isActive: z.boolean(),
  updatedAt: z.string(),
});

export const coopMapListResponseSchema = z.object({
  maps: z.array(coopMapSchema),
});

export const createContributionRoomResponseSchema = z.object({
  roomId: z.number(),
  roomCode: z.string(),
  title: z.string(),
  maxPlayers: z.number(),
  hasPassword: z.boolean(),
});

export const createCoopRoomResponseSchema = z.object({
  roomId: z.number(),
  roomCode: z.string(),
  title: z.string(),
  hasPassword: z.boolean(),
  teamName: z.string(),
  maxPlayers: z.number(),
  selectedMap: z.object({
    mapId: z.string(),
    mapName: z.string(),
    difficulty: z.number(),
  }),
});

export const verifyPasswordResponseSchema = z.object({});

const roomMemberSchema = z.object({
  playerId: z.string(),
  nickname: z.string(),
  characterHair: z.string(),
  characterHairColor: z.string(),
  characterBody: z.string(),
  characterEye: z.string(),
  characterOutfit: z.string(),
  characterOutfitColor: z.string(),
  isReady: z.boolean(),
  isHost: z.boolean(),
});

const mapInfoSchema = z.object({
  mapId: z.string(),
  mapName: z.string(),
  difficulty: z.number(),
});

const selectedMapSchema = z.object({
  mapId: z.string(),
  mapName: z.string(),
  difficulty: z.number(),
});

export const joinContributionRoomResponseSchema = z.object({
  roomId: z.number(),
  roomCode: z.string(),
  title: z.string(),
  mode: z.literal('CONTRIBUTION'),
  roomState: roomStateSchema,
  currentPlayers: z.number(),
  maxPlayers: z.number(),
  members: z.array(roomMemberSchema),
});

export const joinCoopRoomResponseSchema = z.object({
  roomId: z.number(),
  roomCode: z.string(),
  title: z.string(),
  teamName: z.string(),
  mode: z.literal('COOP'),
  roomState: roomStateSchema,
  currentPlayers: z.number(),
  maxPlayers: z.number(),
  selectedMap: selectedMapSchema,
  members: z.array(roomMemberSchema),
  mapList: z.array(mapInfoSchema),
});

// ── WebSocket 로비 메시지 스키마 ────────────────────────────────

export const playerJoinedMessageSchema = z.object({
  type: z.literal('PLAYER_JOINED'),
  roomState: roomStateSchema,
  joinedPlayer: roomMemberSchema,
  allMembers: z.array(roomMemberSchema),
});

export const readyChangedMessageSchema = z.object({
  type: z.literal('READY_CHANGED'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  isReady: z.boolean(),
  allReady: z.boolean(),
});

export const playerLeftMessageSchema = z.object({
  type: z.literal('PLAYER_LEFT'),
  leftPlayerId: z.string(),
  leftPlayerNickname: z.string(),
  remainMembers: z.array(roomMemberSchema),
});

export const hostDelegatedMessageSchema = z.object({
  type: z.literal('HOST_DELEGATED'),
  newHostId: z.string(),
  newHostNickname: z.string(),
  remainMembers: z.array(roomMemberSchema),
});

// ── 재연결용 WebSocket 메시지 스키마 ────────────────────────────────
export const contributionRoomStateMessageSchema = z.object({
  type: z.literal('CONTRIBUTION_ROOM_STATE'),
  roomId: z.number(),
  roomCode: z.string(),
  title: z.string(),
  mode: z.literal('CONTRIBUTION'),
  roomState: roomStateSchema,
  currentPlayers: z.number(),
  maxPlayers: z.number(),
  hasPassword: z.boolean(),
  members: z.array(roomMemberSchema),
});

export const coopRoomStateMessageSchema = z.object({
  type: z.literal('COOP_ROOM_STATE'),
  roomId: z.number(),
  roomCode: z.string(),
  title: z.string(),
  teamName: z.string(),
  mode: z.literal('COOP'),
  roomState: roomStateSchema,
  currentPlayers: z.number(),
  maxPlayers: z.number(),
  hasPassword: z.boolean(),
  selectedMap: selectedMapSchema,
  members: z.array(roomMemberSchema),
});

// /topic/room/{roomId} 에서 수신되는 메시지 (브로드캐스트 이벤트만)
export const roomTopicMessageSchema = z.discriminatedUnion('type', [
  playerJoinedMessageSchema,
  readyChangedMessageSchema,
  playerLeftMessageSchema,
  hostDelegatedMessageSchema,
]);

// /user/queue/private 에서 수신되는 방 상태 스냅샷 메시지
export const roomPrivateMessageSchema = z.discriminatedUnion('type', [
  contributionRoomStateMessageSchema,
  coopRoomStateMessageSchema,
]);

// ── REST fallback 스키마 ────────────────────────────────
// GET /api/v1/rooms/{roomId}/state 응답 data는 WebSocket ROOM_STATE payload와 동일
export const roomStateResponseSchema = roomPrivateMessageSchema;

// ── WebSocket 게임 내 스키마 (공통 채널 + 게임 시작 패킷) ────────────────────────────────

/**
 * 대기실 공통 채널과 게임 시작 패킷을 검증하는 WebSocket Zod 스키마.
 */

export const BaseMessageSchema = z.object({
  type: z.string(),
});

export const PlayerSchema = z.object({
  playerId: z.string().uuid(),
  nickname: z.string(),
  characterHair: z.string(),
  characterHairColor: z.string(),
  characterBody: z.string(),
  characterEye: z.string(),
  characterOutfit: z.string(),
  characterOutfitColor: z.string(),
  isReady: z.boolean(),
  isHost: z.boolean(),
});

export const RoomStateSchema = z.object({
  type: z.literal('ROOM_STATE'),
  roomId: z.string(),
  roomTitle: z.string(),
  maxPlayers: z.number(),
  isPrivate: z.boolean(),
  gameMode: z.string(),
  gameState: z.string(),
  hostId: z.string().uuid(),
  members: z.array(PlayerSchema),
});

export const PlayerJoinedSchema = z.object({
  type: z.literal('PLAYER_JOINED'),
  roomState: z.enum(['WAITING', 'IN_GAME']),
  joinedPlayer: PlayerSchema,
  allMembers: z.array(PlayerSchema),
});

export const PlayerLeftSchema = z.object({
  type: z.literal('PLAYER_LEFT'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  remainMembers: z.array(PlayerSchema),
});

export const PlayerKickedSchema = z.object({
  type: z.literal('PLAYER_KICKED'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  remainMembers: z.array(PlayerSchema),
});

export const KickedSchema = z.object({
  type: z.literal('KICKED'),
  playerId: z.string().uuid(),
  roomId: z.string(),
});

export const ReadyChangedSchema = z.object({
  type: z.literal('READY_CHANGED'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  isReady: z.boolean(),
  allReady: z.boolean(),
});

export const HostDelegatedSchema = z.object({
  type: z.literal('HOST_DELEGATED'),
  newHostId: z.string().uuid(),
  newHostNickname: z.string(),
  remainMembers: z.array(PlayerSchema),
});

export const HostTransferredSchema = z.object({
  type: z.literal('HOST_TRANSFERRED'),
  newHostId: z.string().uuid(),
  newHostNickname: z.string(),
  allMembers: z.array(PlayerSchema),
});

export const ContributionRoomInfoUpdatedSchema = z.object({
  type: z.literal('CONTRIBUTION_ROOM_INFO_UPDATED'),
});

export const CoopRoomInfoUpdatedSchema = z.object({
  type: z.literal('COOP_ROOM_INFO_UPDATED'),
});

export const RoomInfoUpdatedSchema = z.union([
  ContributionRoomInfoUpdatedSchema,
  CoopRoomInfoUpdatedSchema,
]);

export const ChatResponseSchema = z.object({
  type: z.literal('CHAT_RESPONSE'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  message: z.string(),
  sentAt: z.number(),
});

export const ForceDisconnectSchema = z.object({
  type: z.literal('FORCE_DISCONNECT'),
  code: z.string(),
  message: z.string(),
});

export const ErrorSchema = z.object({
  type: z.literal('ERROR'),
  code: z.string(),
  message: z.string(),
});

const GameStartCommandSchema = z.object({
  commandSequence: z.number(),
  text: z.string(),
  branchName: z.string(),
});

const GameStartPlayerSchema = z.object({
  playerId: z.string().uuid(),
  nickname: z.string(),
});

export const ContributionStartedSchema = z.object({
  type: z.literal('CONTRIBUTION_STARTED'),
  serverTime: z.number(),
  startAt: z.number(),
  gameSessionId: z.string(),
  commandSetId: z.number(),
  initialBranch: z.string(),
  commandSet: z.array(GameStartCommandSchema),
  players: z.array(
    GameStartPlayerSchema.extend({
      bestContribution: z.number(),
    })
  ),
});

export const CoopStartedSchema = z.object({
  type: z.literal('COOP_STARTED'),
  serverTime: z.number(),
  startAt: z.number(),
  gameSessionId: z.string(),
  totalRounds: z.number(),
  graphData: z.object({
    viewBox: z.string(),
    nodes: z.array(
      z.object({
        sequence: z.number(),
        x: z.number(),
        y: z.number(),
        label: z.string(),
        branch: z.string(),
      })
    ),
    edges: z.array(
      z.object({
        from: z.number(),
        to: z.number(),
        type: z.enum(['solid', 'dashed', 'curve']),
      })
    ),
  }),
  players: z.array(
    GameStartPlayerSchema.extend({
      bestTime: z.number(),
    })
  ),
});

export type BaseMessage = z.infer<typeof BaseMessageSchema>;
export type ForceDisconnectMessage = z.infer<typeof ForceDisconnectSchema>;
export type KickedMessage = z.infer<typeof KickedSchema>;
export type SocketErrorMessage = z.infer<typeof ErrorSchema>;
export type ContributionStartedMessage = z.infer<typeof ContributionStartedSchema>;
export type CoopStartedMessage = z.infer<typeof CoopStartedSchema>;
