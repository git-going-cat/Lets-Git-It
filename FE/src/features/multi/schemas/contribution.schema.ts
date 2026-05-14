import { z } from 'zod';

/**
 * 기여도 뺏기 게임 채널 수신 패킷을 검증하는 WebSocket Zod 스키마.
 *
 * V3 명세 기준으로 대조 보완됨. 주요 변경:
 * - CommandExpiredSchema: gameSessionId/serverTime 추가, progress Integer → Object
 * - ContributionInputFailedSchema: errorCode → errorReason (V3 변경)
 * - ContributionGameEndSuccessSchema: isSuccess/reason 필드 추가
 * - ContributionGameEndSchema: z.union → z.discriminatedUnion('isSuccess')
 * - CommandSpawnSchema: 신규 추가 (V3 명세 외 이벤트 — 실제 서버 구현 확인 필요)
 */

const ProgressSchema = z.object({
  current: z.number(),
  total: z.number(),
  percent: z.number(),
});

const ScoreEntrySchema = z.object({
  playerId: z.uuid(),
  nickname: z.string(),
  contribution: z.number(),
  rank: z.number(),
});

const ScoreEntryWithMeSchema = ScoreEntrySchema.extend({
  isMe: z.boolean().optional(),
});

export const PositionUpdateSchema = z.object({
  type: z.literal('POSITION_UPDATE'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  requestId: z.string(),
  playerId: z.uuid(),
  branch: z.string(),
});

export const ScoreUpdateSchema = z.object({
  type: z.literal('SCORE_UPDATE'),
  gameSessionId: z.string(),
  requestId: z.string(),
  serverTime: z.number(),
  commandSequence: z.number(),
  winnerId: z.uuid(),
  scores: z.array(ScoreEntryWithMeSchema),
  progress: ProgressSchema,
});

export const CommandExpiredSchema = z.object({
  type: z.literal('COMMAND_EXPIRED'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  commandSequence: z.number(),
  scores: z.array(ScoreEntrySchema),
  progress: ProgressSchema,
});

export const ContributionInputFailedSchema = z.object({
  type: z.literal('CONTRIBUTION_INPUT_FAILED'),
  gameSessionId: z.string(),
  requestId: z.string(),
  serverTime: z.number(),
  playerId: z.uuid(),
  // V3 변경: errorCode → errorReason (INVALID_BRANCH | WRONG_COMMAND)
  errorReason: z.string(),
});

// TODO: V3 명세에 없는 이벤트. 실제 서버 구현 확인 후 필드 보완 필요.
export const CommandSpawnSchema = z.object({
  type: z.literal('COMMAND_SPAWN'),
  commandId: z.number(),
  commandText: z.string(),
  spawnedAt: z.number(),
});

const ContributionGameEndSuccessSchema = z.object({
  type: z.literal('CONTRIBUTION_GAME_END'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  isSuccess: z.literal(true),
  reason: z.string(),
  rankings: z.array(ScoreEntryWithMeSchema),
  winnerVideoTarget: z.uuid(),
});

const ContributionGameEndEarlySchema = z.object({
  type: z.literal('CONTRIBUTION_GAME_END'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  isSuccess: z.literal(false),
  reason: z.string(),
  // V3 이탈 종료 응답에는 playerId/nickname 미포함. 하위 호환을 위해 optional 유지.
  playerId: z.uuid().optional(),
  nickname: z.string().optional(),
});

export const ContributionGameEndSchema = z.discriminatedUnion('isSuccess', [
  ContributionGameEndSuccessSchema,
  ContributionGameEndEarlySchema,
]);

export type ContributionGameEndMessage = z.infer<typeof ContributionGameEndSchema>;
