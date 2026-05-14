import { z } from 'zod';

/**
 * 기여도 뺏기 게임 채널 수신 패킷을 검증하는 WebSocket Zod 스키마.
 */

const ScoreEntrySchema = z.object({
  playerId: z.string().uuid(),
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
  playerId: z.string().uuid(),
  branch: z.string(),
});

export const ScoreUpdateSchema = z.object({
  type: z.literal('SCORE_UPDATE'),
  gameSessionId: z.string(),
  requestId: z.string(),
  serverTime: z.number(),
  commandSequence: z.number(),
  winnerId: z.string().uuid(),
  scores: z.array(ScoreEntryWithMeSchema),
  progress: z.object({
    current: z.number(),
    total: z.number(),
    percent: z.number(),
  }),
});

export const CommandExpiredSchema = z.object({
  type: z.literal('COMMAND_EXPIRED'),
  commandSequence: z.number(),
  scores: z.array(ScoreEntrySchema),
  progress: z.number(),
});

export const ContributionInputFailedSchema = z.object({
  type: z.literal('CONTRIBUTION_INPUT_FAILED'),
  gameSessionId: z.string(),
  requestId: z.string(),
  serverTime: z.number(),
  playerId: z.string().uuid(),
  errorCode: z.string(),
});

const ContributionGameEndSuccessSchema = z.object({
  type: z.literal('CONTRIBUTION_GAME_END'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  rankings: z.array(ScoreEntryWithMeSchema),
  winnerVideoTarget: z.string().uuid(),
});

const ContributionGameEndEarlySchema = z.object({
  type: z.literal('CONTRIBUTION_GAME_END'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  isSuccess: z.literal(false),
  reason: z.string(),
  playerId: z.string().uuid(),
  nickname: z.string(),
});

export const ContributionGameEndSchema = z.union([
  ContributionGameEndSuccessSchema,
  ContributionGameEndEarlySchema,
]);

export type ContributionGameEndMessage = z.infer<typeof ContributionGameEndSchema>;
