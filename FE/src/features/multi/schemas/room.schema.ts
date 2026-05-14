import { z } from 'zod';

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

export const PlayerWithMeSchema = PlayerSchema.extend({
  isMe: z.boolean().optional(),
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
  allMembers: z.array(PlayerWithMeSchema),
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
  allMembers: z.array(PlayerWithMeSchema),
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
