import { z } from 'zod';

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
  isMe: z.boolean(),
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
