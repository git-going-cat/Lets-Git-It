import { z } from 'zod';

import {
  errorSchema,
  forceDisconnectSchema,
  kickedSchema,
} from '@/features/multi/schemas/room.schema';

/**
 * 기여도 뺏기 게임 채널 수신 패킷을 검증하는 WebSocket Zod 스키마.
 * 게임 중 수신이므로 모든 사용처에서 .safeParse()만 사용할 것.
 */

/** CONTRIBUTION_STARTED — WaitingRoom에서 수신, 게임 시작 신호. */
export const ContributionStartedSchema = z.object({
  type: z.literal('CONTRIBUTION_STARTED'),
  serverTime: z.number(),
  startAt: z.number(),
  gameSessionId: z.string().uuid(),
  commandSetId: z.number(),
  initialBranch: z.string(),
  commandSet: z.array(
    z.object({
      commandSequence: z.number(),
      text: z.string(),
      branchName: z.string(),
      fallDurationMs: z.number(),
    })
  ),
  players: z.array(
    z.object({
      playerId: z.string().uuid(),
      nickname: z.string(),
      bestContribution: z.number(),
    })
  ),
});

const ScoreEntrySchema = z.object({
  playerId: z.string().uuid().nullable(),
  nickname: z.string(),
  contribution: z.number(),
  rank: z.number(),
  disconnected: z.boolean(),
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
  gameSessionId: z.string(),
  serverTime: z.number(),
  commandSequence: z.number(),
  scores: z.array(ScoreEntrySchema),
  progress: z.object({
    current: z.number(),
    total: z.number(),
    percent: z.number(),
  }),
});

export const ContributionInputFailedSchema = z.object({
  type: z.literal('CONTRIBUTION_INPUT_FAILED'),
  gameSessionId: z.string(),
  requestId: z.string(),
  serverTime: z.number(),
  playerId: z.string().uuid(),
  errorReason: z.string(),
});

const ContributionGameEndSuccessSchema = z.object({
  type: z.literal('CONTRIBUTION_GAME_END'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  isSuccess: z.literal(true),
  reason: z.string(),
  rankings: z.array(ScoreEntryWithMeSchema),
  winnerVideoTarget: z.string().uuid().nullable(),
});

const ContributionGameEndEarlySchema = z.object({
  type: z.literal('CONTRIBUTION_GAME_END'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  isSuccess: z.literal(false),
  reason: z.string(),
});

export const ContributionGameEndSchema = z.union([
  ContributionGameEndSuccessSchema,
  ContributionGameEndEarlySchema,
]);

export type ContributionGameEndMessage = z.infer<typeof ContributionGameEndSchema>;

export const ContributionPlayerDisconnectedSchema = z.object({
  type: z.literal('CONTRIBUTION_PLAYER_DISCONNECTED'),
  gameSessionId: z.string(),
  serverTime: z.number(),
  disconnectedPlayerId: z.string().uuid(),
  scores: z.array(ScoreEntrySchema),
});

/** 게임 채널(/topic/room/{roomId}/contribution) 수신 메시지 discriminatedUnion (CONTRIBUTION_GAME_END 제외). */
export const contributionGameTopicMessageSchema = z.discriminatedUnion('type', [
  PositionUpdateSchema,
  ScoreUpdateSchema,
  CommandExpiredSchema,
  ContributionPlayerDisconnectedSchema,
]);

/** private 큐(/user/queue/private) 수신 메시지 discriminatedUnion (시스템 이벤트 포함). */
export const contributionPrivateMessageSchema = z.discriminatedUnion('type', [
  ContributionInputFailedSchema,
  forceDisconnectSchema,
  errorSchema,
  kickedSchema,
]);

export type ContributionGameTopicMessage = z.infer<typeof contributionGameTopicMessageSchema>;
export type ContributionPrivateMessage = z.infer<typeof contributionPrivateMessageSchema>;
