import { z } from 'zod';

// ?? REST API ?ㅽ궎留?????????????????????????????????????????????????
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
  hasPassword: z.boolean(),
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
  hasPassword: z.boolean(),
  selectedMap: selectedMapSchema,
  members: z.array(roomMemberSchema),
  mapList: z.array(mapInfoSchema).default([]),
});

// ?? WebSocket 濡쒕퉬 硫붿떆吏 ?ㅽ궎留?????????????????????????????????

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

export const playerKickedMessageSchema = z.object({
  type: z.literal('PLAYER_KICKED'),
  playerId: z.string(),
  nickname: z.string(),
  remainMembers: z.array(roomMemberSchema),
});

export const hostDelegatedMessageSchema = z.object({
  type: z.literal('HOST_DELEGATED'),
  newHostId: z.string(),
  newHostNickname: z.string(),
  remainMembers: z.array(roomMemberSchema),
});

export const hostTransferredMessageSchema = z.object({
  type: z.literal('HOST_TRANSFERRED'),
  newHostId: z.string(),
  newHostNickname: z.string(),
  allMembers: z.array(roomMemberSchema),
});

export const contributionRoomInfoUpdatedSchema = z.object({
  type: z.literal('CONTRIBUTION_ROOM_INFO_UPDATED'),
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

export const coopRoomInfoUpdatedSchema = z.object({
  type: z.literal('COOP_ROOM_INFO_UPDATED'),
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

export const chatResponseMessageSchema = z.object({
  type: z.literal('CHAT_RESPONSE'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  message: z.string(),
  sentAt: z.number(),
});

export const roomInfoUpdatedSchema = z.union([
  contributionRoomInfoUpdatedSchema,
  coopRoomInfoUpdatedSchema,
]);

// ?? ?ъ뿰寃곗슜 WebSocket 硫붿떆吏 ?ㅽ궎留?????????????????????????????????
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

// /topic/room/{roomId} ?먯꽌 ?섏떊?섎뒗 硫붿떆吏 (釉뚮줈?쒖틦?ㅽ듃 ?대깽?몃쭔)
export const roomTopicMessageSchema = z.discriminatedUnion('type', [
  playerJoinedMessageSchema,
  readyChangedMessageSchema,
  playerLeftMessageSchema,
  playerKickedMessageSchema,
  hostDelegatedMessageSchema,
  hostTransferredMessageSchema,
  contributionRoomInfoUpdatedSchema,
  coopRoomInfoUpdatedSchema,
  chatResponseMessageSchema,
]);

// /user/queue/private ?먯꽌 ?섏떊?섎뒗 諛??곹깭 ?ㅻ깄??硫붿떆吏
export const roomPrivateMessageSchema = z.discriminatedUnion('type', [
  contributionRoomStateMessageSchema,
  coopRoomStateMessageSchema,
]);

// ?? REST fallback ?ㅽ궎留?????????????????????????????????
// GET /api/v1/rooms/{roomId}/state ?묐떟 data??WebSocket ROOM_STATE payload? ?숈씪
export const roomStateResponseSchema = roomPrivateMessageSchema;

// ?? WebSocket 寃뚯엫 ???ㅽ궎留?(怨듯넻 梨꾨꼸 + 寃뚯엫 ?쒖옉 ?⑦궥) ????????????????????????????????

/**
 * ?湲곗떎 怨듯넻 梨꾨꼸怨?寃뚯엫 ?쒖옉 ?⑦궥??寃利앺븯??WebSocket Zod ?ㅽ궎留?
 */

export const baseMessageSchema = z.object({
  type: z.string(),
});

export const playerSchema = z.object({
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

export const roomStateMessageSchema = z.object({
  type: z.literal('ROOM_STATE'),
  roomId: z.string(),
  roomTitle: z.string(),
  maxPlayers: z.number(),
  isPrivate: z.boolean(),
  gameMode: z.string(),
  gameState: z.string(),
  hostId: z.string().uuid(),
  members: z.array(playerSchema),
});

export const playerJoinedLegacySchema = z.object({
  type: z.literal('PLAYER_JOINED'),
  roomState: z.enum(['WAITING', 'IN_GAME']),
  joinedPlayer: playerSchema,
  allMembers: z.array(playerSchema),
});

export const playerLeftLegacySchema = z.object({
  type: z.literal('PLAYER_LEFT'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  remainMembers: z.array(playerSchema),
});

export const playerKickedLegacySchema = z.object({
  type: z.literal('PLAYER_KICKED'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  remainMembers: z.array(playerSchema),
});

export const kickedSchema = z.object({
  type: z.literal('KICKED'),
  playerId: z.string().uuid(),
  roomId: z.number(),
});

export const readyChangedLegacySchema = z.object({
  type: z.literal('READY_CHANGED'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  isReady: z.boolean(),
  allReady: z.boolean(),
});

export const hostDelegatedLegacySchema = z.object({
  type: z.literal('HOST_DELEGATED'),
  newHostId: z.string().uuid(),
  newHostNickname: z.string(),
  remainMembers: z.array(playerSchema),
});

export const hostTransferredLegacySchema = z.object({
  type: z.literal('HOST_TRANSFERRED'),
  newHostId: z.string().uuid(),
  newHostNickname: z.string(),
  allMembers: z.array(playerSchema),
});

export const chatResponseSchema = z.object({
  type: z.literal('CHAT_RESPONSE'),
  playerId: z.string().uuid(),
  nickname: z.string(),
  message: z.string(),
  sentAt: z.number(),
});

export const forceDisconnectSchema = z.object({
  type: z.literal('FORCE_DISCONNECT'),
  code: z.string(),
  message: z.string(),
});

export const errorSchema = z.object({
  type: z.literal('ERROR'),
  code: z.string(),
  message: z.string(),
});

const gameStartCommandSchema = z.object({
  commandSequence: z.number(),
  text: z.string(),
  branchName: z.string(),
});

const gameStartPlayerSchema = z.object({
  playerId: z.string().uuid(),
  nickname: z.string(),
});

export const contributionStartedSchema = z.object({
  type: z.literal('CONTRIBUTION_STARTED'),
  serverTime: z.number(),
  startAt: z.number(),
  gameSessionId: z.string(),
  commandSetId: z.number(),
  initialBranch: z.string(),
  commandSet: z.array(gameStartCommandSchema),
  players: z.array(
    gameStartPlayerSchema.extend({
      bestContribution: z.number(),
    })
  ),
});

export const coopStartedSchema = z.object({
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
  players: z.array(gameStartPlayerSchema),
});

export type BaseMessage = z.infer<typeof baseMessageSchema>;
export type ForceDisconnectMessage = z.infer<typeof forceDisconnectSchema>;
export type KickedMessage = z.infer<typeof kickedSchema>;
export type SocketErrorMessage = z.infer<typeof errorSchema>;
export type ContributionStartedMessage = z.infer<typeof contributionStartedSchema>;
export type CoopStartedMessage = z.infer<typeof coopStartedSchema>;
