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
  playerId: z.string().min(1),
  nickname: z.string(),
  contribution: z.number(),
  playCount: z.number(),
});

const timeAttackRankingEntrySchema = z.object({
  rank: z.number(),
  nickname: z.string(),
  totalCount: z.number(),
});

const coopRankingMemberSchema = z.object({
  playerId: z.string().min(1),
  nickname: z.string(),
});

const coopRankingEntrySchema = z.object({
  rank: z.number(),
  teamName: z.string(),
  mapName: z.string(),
  difficulty: z.number(),
  elapsedTime: z.number(),
  totalWrongTypeCount: z.number(),
  totalWrongOrderCount: z.number(),
  members: z.array(coopRankingMemberSchema),
});

export const coopRankingMapSchema = z.object({
  mapId: z.string(),
  mapName: z.string(),
  difficulty: z.number(),
  isActive: z.boolean(),
  updatedAt: z.string(),
});

export const coopRankingMapListResponseSchema = z.object({
  maps: z.array(coopRankingMapSchema),
});

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
    myRank: z
      .object({ rank: z.number(), contribution: z.number(), playCount: z.number() })
      .nullable(),
    around: z.array(speedRankingEntrySchema),
  });

export const timeAttackInitialResponseSchema = weekHeaderSchema.merge(paginationSchema).extend({
  top3: z.array(timeAttackRankingEntrySchema),
  myRank: z.object({ rank: z.number(), totalCount: z.number() }).nullable(),
  around: z.array(timeAttackRankingEntrySchema),
});

export const coopInitialResponseSchema = weekHeaderSchema
  .merge(bidirectionalPaginationSchema)
  .extend({
    top3: z.array(coopRankingEntrySchema),
    myRank: coopRankingEntrySchema.nullable(),
    around: z.array(coopRankingEntrySchema),
  });

export const singleInfiniteResponseSchema = bidirectionalPaginationSchema.extend({
  rankings: z.array(singleRankingEntrySchema),
});

export const speedInfiniteResponseSchema = bidirectionalPaginationSchema.extend({
  rankings: z.array(speedRankingEntrySchema),
});

export const timeAttackInfiniteResponseSchema = paginationSchema.extend({
  rankings: z.array(timeAttackRankingEntrySchema),
});

export const coopInfiniteResponseSchema = bidirectionalPaginationSchema.extend({
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
