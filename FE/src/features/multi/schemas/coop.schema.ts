import { z } from 'zod';

/**
 * 협력 게임 채널 수신 패킷을 검증하는 WebSocket Zod 스키마.
 *
 * V3 명세 기준으로 대조 보완됨. 주요 변경:
 * - CoopRoundAssignSchema: wrongPlayerNickname nullable 처리 (isReset:false 시 null)
 * - CoopGameEndSuccessSchema: reason 필드 추가, finalGraph optional 처리
 * - CoopGameEndFailureSchema: playerId/nickname optional 처리 (V3 실패 응답에 미포함)
 * - CoopNextRoundSchema: 신규 추가 (V3 명세 외 이벤트 — 실제 서버 구현 확인 필요)
 */

export const CoopRoundRevealSchema = z.object({
  type: z.literal('COOP_ROUND_REVEAL'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  round: z.number(),
  // V3 변경: revealEndsAt → revealStartsAt
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
  // V3: isReset:false 인 경우 null. nullable로 처리.
  wrongPlayerNickname: z.string().nullable(),
});

export const CoopInputWrongSchema = z.object({
  type: z.literal('COOP_INPUT_WRONG'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  requestId: z.string(),
  playerId: z.uuid(),
});

export const CoopOrderWrongSchema = z.object({
  type: z.literal('COOP_ORDER_WRONG'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  requestId: z.string(),
  resetTargetPlayerId: z.uuid(),
  nickname: z.string(),
});

export const CoopInputCorrectSchema = z.object({
  type: z.literal('COOP_INPUT_CORRECT'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  requestId: z.string(),
  sequence: z.number(),
  isRoundComplete: z.boolean(),
});

export const CoopResetWrongSchema = z.object({
  type: z.literal('COOP_RESET_WRONG'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  requestId: z.string(),
  playerId: z.uuid(),
});

// TODO: V3 명세에 없는 이벤트. 실제 서버 구현 확인 후 필드 보완 필요.
export const CoopNextRoundSchema = z.object({
  type: z.literal('COOP_NEXT_ROUND'),
});

const CoopGameEndSuccessSchema = z.object({
  type: z.literal('COOP_GAME_END'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  isSuccess: z.literal(true),
  reason: z.string(),
  elapsedTime: z.number(),
  // finalGraph는 V3 명세에 없으나 하위 호환을 위해 optional 유지.
  finalGraph: z.unknown().optional(),
  results: z.array(
    z.object({
      playerId: z.uuid(),
      nickname: z.string(),
      wrongTypeCount: z.number(),
      wrongOrderCount: z.number(),
      ranking: z.number(),
      isMe: z.boolean().optional(),
    })
  ),
});

const CoopGameEndFailureSchema = z.object({
  type: z.literal('COOP_GAME_END'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  isSuccess: z.literal(false),
  reason: z.string(),
  // V3 이탈 종료 응답에는 playerId/nickname 미포함. 하위 호환을 위해 optional 유지.
  playerId: z.uuid().optional(),
  nickname: z.string().optional(),
});

export const CoopGameEndSchema = z.discriminatedUnion('isSuccess', [
  CoopGameEndSuccessSchema,
  CoopGameEndFailureSchema,
]);

export type CoopGameEndMessage = z.infer<typeof CoopGameEndSchema>;
