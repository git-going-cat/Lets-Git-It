import { z } from 'zod';

/**
 * 협력 게임 채널 수신 패킷을 검증하는 WebSocket Zod 스키마.
 */

export const CoopRoundRevealSchema = z.object({
  type: z.literal('COOP_ROUND_REVEAL'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  round: z.number(),
  isReset: z.boolean(),
  revealStartsAt: z.number(),
  commands: z.array(
    z.object({
      commandOrder: z.number(),
      commandText: z.string(),
    })
  ),
});

export const CoopRoundAssignSchema = z.object({
  type: z.literal('COOP_ROUND_ASSIGN'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  round: z.number(),
  isReset: z.boolean(),
  myCommandText: z.string(),
  wrongPlayerNickname: z.string().nullable(),
});

export const CoopInputWrongSchema = z.object({
  type: z.literal('COOP_INPUT_WRONG'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  requestId: z.string(),
  playerId: z.string().uuid(),
});

export const CoopOrderWrongSchema = z.object({
  type: z.literal('COOP_ORDER_WRONG'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  requestId: z.string(),
  resetTargetPlayerId: z.string().uuid(),
  nickname: z.string(),
});

export const CoopInputCorrectSchema = z.object({
  type: z.literal('COOP_INPUT_CORRECT'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  requestId: z.string(),
  sequence: z.number(),
  round: z.number(),
  stepInRound: z.number(),
  isRoundComplete: z.boolean(),
});

export const CoopResetWrongSchema = z.object({
  type: z.literal('COOP_RESET_WRONG'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  requestId: z.string(),
  playerId: z.string().uuid(),
});

const CoopGameEndSuccessSchema = z.object({
  type: z.literal('COOP_GAME_END'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  isSuccess: z.literal(true),
  reason: z.string(),
  elapsedTime: z.number(),
  finalGraph: z.unknown().optional(),
  results: z.array(
    z.object({
      playerId: z.string().uuid(),
      nickname: z.string(),
      wrongTypeCount: z.number(),
      wrongOrderCount: z.number(),
      ranking: z.number(),
      newRecord: z.boolean().optional(),
      isMe: z.boolean().optional(),
    })
  ),
});

const CoopGameEndFailureSchema = z.object({
  type: z.literal('COOP_GAME_END'),
  gameSessionId: z.string().nullable(),
  serverTime: z.number(),
  isSuccess: z.literal(false),
  reason: z.string(),
  playerId: z.string().uuid().optional(),
  nickname: z.string().optional(),
});

export const CoopGameEndSchema = z.discriminatedUnion('isSuccess', [
  CoopGameEndSuccessSchema,
  CoopGameEndFailureSchema,
]);

export type CoopGameEndMessage = z.infer<typeof CoopGameEndSchema>;
