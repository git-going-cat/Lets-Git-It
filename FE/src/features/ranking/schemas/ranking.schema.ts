import { z } from 'zod';

// ── Entry 스키마 ───────────────────────────────────────────

const singleRankingEntrySchema = z.object({
  rank: z.number(),
  nickname: z.string(),
  score: z.number(),
  grade: z.enum(['S', 'A', 'B', 'C', 'D', 'F']).nullable().optional(),
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

const coopRankingEntrySchema = z.object({
  rank: z.number(),
  nickname: z.string(),
  clearTime: z.number(),
});

const rankingEntryBaseSchema = z.union([
  singleRankingEntrySchema,
  speedRankingEntrySchema,
  timeAttackRankingEntrySchema,
  coopRankingEntrySchema,
]);

// ── 공통 무한 스크롤 페이지네이션 필드 ───────────────────

const paginationSchema = z.object({
  nextCursor: z.number().nullable(),
  hasNext: z.boolean(),
});

const bidirectionalPaginationSchema = paginationSchema.extend({
  prevCursor: z.number().nullable().optional(),
  hasPrev: z.boolean().optional(),
});

// ── 초기 응답 공통 헤더 (주차 정보) ──────────────────────

const weekHeaderSchema = z.object({
  year: z.number(),
  month: z.number(),
  week: z.number(),
});

// ── 초기 응답 스키마 (top3 + myRank + around) ─────────────

export const singleInitialResponseSchema = weekHeaderSchema
  .merge(bidirectionalPaginationSchema)
  .extend({
    top3: z.array(singleRankingEntrySchema),
    myRank: z
      .object({
        rank: z.number(),
        score: z.number(),
        grade: z.enum(['S', 'A', 'B', 'C', 'D', 'F']).nullable().optional(),
      })
      .nullable(),
    around: z.array(singleRankingEntrySchema),
  });

export const speedInitialResponseSchema = weekHeaderSchema.merge(paginationSchema).extend({
  top3: z.array(speedRankingEntrySchema),
  myRank: z.object({ rank: z.number(), contribution: z.number() }).nullable(),
  around: z.array(speedRankingEntrySchema),
});

export const timeAttackInitialResponseSchema = weekHeaderSchema.merge(paginationSchema).extend({
  top3: z.array(timeAttackRankingEntrySchema),
  myRank: z.object({ rank: z.number(), totalCount: z.number() }).nullable(),
  around: z.array(timeAttackRankingEntrySchema),
});

export const coopInitialResponseSchema = weekHeaderSchema.merge(paginationSchema).extend({
  mapId: z.number(),
  mapName: z.string(),
  top3: z.array(coopRankingEntrySchema),
  myRank: z.object({ rank: z.number(), clearTime: z.number() }).nullable(),
  around: z.array(coopRankingEntrySchema),
});

// ── 무한 스크롤 응답 스키마 (rankings) ───────────────────

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

// ── API 함수별 유니온 스키마 (초기 | 무한 스크롤) ─────────

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
