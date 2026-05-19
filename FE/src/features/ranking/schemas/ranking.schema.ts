import { z } from 'zod';

const singleRankingEntrySchema = z.object({
  rank: z.number(),
  nickname: z.string(),
  score: z.number(),
  grade: z.enum(['S', 'A', 'B', 'C', 'D', 'F']).nullable().optional(),
  playTime: z.number().nullable().optional(),
});

const speedRankingEntrySchema = z.object({
  rank: z.number(),
  nickname: z.string(),
  contribution: z.number(),
});

const timeAttackRankingEntrySchema = z.object({
  rank: z.number(),
  nickname: z.string(),
  totalCount: z.number(),
});

const coopMemberSchema = z.object({
  playerId: z.string(),
  nickname: z.string(),
});

const coopRankingEntrySchema = z
  .object({
    rank: z.number(),
    clearTime: z.number().optional(),
    elapsedTime: z.number().optional(),
    difficulty: z.number(),
    nickname: z.string().optional(),
    teamName: z.string().optional(),
    members: z.union([z.array(z.string()), z.array(coopMemberSchema)]).optional(),
    wrongTypeCount: z.number().optional(),
    wrongOrderCount: z.number().optional(),
    totalWrongTypeCount: z.number().optional(),
    totalWrongOrderCount: z.number().optional(),
    mapId: z.union([z.string(), z.number()]).optional(),
    mapName: z.string().optional(),
  })
  .transform((entry) => ({
    rank: entry.rank,
    clearTime: entry.clearTime ?? entry.elapsedTime ?? 0,
    difficulty: entry.difficulty,
    nickname: entry.nickname,
    teamName: entry.teamName,
    members: entry.members?.map((member) =>
      typeof member === 'string' ? member : member.nickname
    ),
    wrongTypeCount: entry.wrongTypeCount ?? entry.totalWrongTypeCount ?? 0,
    wrongOrderCount: entry.wrongOrderCount ?? entry.totalWrongOrderCount ?? 0,
    mapId: entry.mapId,
    mapName: entry.mapName,
  }));

const rankingEntryBaseSchema = z.union([
  singleRankingEntrySchema,
  speedRankingEntrySchema,
  timeAttackRankingEntrySchema,
  coopRankingEntrySchema,
]);

const paginationSchema = z.object({
  nextCursor: z.number().nullable(),
  hasNext: z.boolean(),
});

const bidirectionalPaginationSchema = paginationSchema.extend({
  prevCursor: z.number().nullable().optional(),
  hasPrev: z.boolean().optional(),
});

const weekHeaderSchema = z.object({
  year: z.number(),
  month: z.number(),
  week: z.number(),
});

export const singleInitialResponseSchema = weekHeaderSchema
  .merge(bidirectionalPaginationSchema)
  .extend({
    top3: z.array(singleRankingEntrySchema),
    myRank: z
      .object({
        rank: z.number(),
        score: z.number(),
        grade: z.enum(['S', 'A', 'B', 'C', 'D', 'F']).nullable().optional(),
        playTime: z.number().nullable().optional(),
      })
      .nullable(),
    around: z.array(singleRankingEntrySchema),
  });

export const speedInitialResponseSchema = weekHeaderSchema
  .merge(bidirectionalPaginationSchema)
  .extend({
    top3: z.array(speedRankingEntrySchema),
    myRank: z.object({ rank: z.number(), contribution: z.number() }).nullable(),
    around: z.array(speedRankingEntrySchema),
  });

export const timeAttackInitialResponseSchema = weekHeaderSchema
  .merge(bidirectionalPaginationSchema)
  .extend({
    top3: z.array(timeAttackRankingEntrySchema),
    myRank: z.object({ rank: z.number(), totalCount: z.number() }).nullable(),
    around: z.array(timeAttackRankingEntrySchema),
  });

export const coopInitialResponseSchema = weekHeaderSchema
  .merge(bidirectionalPaginationSchema)
  .extend({
    mapId: z.union([z.string(), z.number()]).optional(),
    mapName: z.string().optional(),
    difficulty: z.number().optional(),
    top3: z.array(coopRankingEntrySchema),
    myRank: z
      .object({
        rank: z.number(),
        clearTime: z.number().optional(),
        elapsedTime: z.number().optional(),
      })
      .transform((rank) => ({
        rank: rank.rank,
        clearTime: rank.clearTime ?? rank.elapsedTime ?? 0,
      }))
      .nullable(),
    around: z.array(coopRankingEntrySchema),
  });

export const singleInfiniteResponseSchema = bidirectionalPaginationSchema.extend({
  rankings: z.array(singleRankingEntrySchema),
});

export const speedInfiniteResponseSchema = paginationSchema.extend({
  rankings: z.array(speedRankingEntrySchema),
});

export const timeAttackInfiniteResponseSchema = paginationSchema.extend({
  rankings: z.array(timeAttackRankingEntrySchema),
});

export const coopInfiniteResponseSchema = paginationSchema.extend({
  rankings: z.array(coopRankingEntrySchema),
});

export const rankingWindowResponseSchema = z.object({
  rankings: z.array(rankingEntryBaseSchema),
  nextCursor: z.number().nullable(),
  hasNext: z.boolean(),
});

export const singleRankingResponseSchema = z.union([
  singleInitialResponseSchema,
  singleInfiniteResponseSchema,
]);

export const speedRankingResponseSchema = z.union([
  speedInitialResponseSchema,
  speedInfiniteResponseSchema,
]);

export const timeAttackRankingResponseSchema = z.union([
  timeAttackInitialResponseSchema,
  timeAttackInfiniteResponseSchema,
]);

export const coopRankingResponseSchema = z.union([
  coopInitialResponseSchema,
  coopInfiniteResponseSchema,
]);
