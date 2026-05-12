import { z } from 'zod';

const gameModeSchema = z.enum(['CONTRIBUTION_RUN', 'TIME_ATTACK', 'COOP']);
const roomStatusSchema = z.enum(['WAITING', 'IN_GAME']);
const roomStateSchema = z.enum(['WAITING', 'COUNTDOWN', 'IN_GAME', 'RESULT']);

export const roomSummarySchema = z.object({
  roomId: z.number(),
  title: z.string(),
  mode: gameModeSchema,
  currentPlayers: z.number(),
  maxPlayers: z.number(),
  hasPassword: z.boolean(),
  status: roomStatusSchema,
});

export const roomListResponseSchema = z.object({
  rooms: z.array(roomSummarySchema),
});

export const createRoomResponseSchema = z.object({
  roomId: z.number(),
  roomCode: z.string(),
  title: z.string(),
  mode: gameModeSchema,
  maxPlayers: z.number(),
  hasPassword: z.boolean(),
});

export const verifyPasswordResponseSchema = z.object({
  verified: z.boolean(),
});

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

export const joinRoomResponseSchema = z.object({
  roomId: z.number(),
  roomCode: z.string(),
  title: z.string(),
  mode: gameModeSchema,
  roomState: roomStateSchema,
  currentPlayers: z.number(),
  maxPlayers: z.number(),
  members: z.array(roomMemberSchema),
  mapList: z.array(z.object({ mapName: z.string(), difficulty: z.string() })),
});
