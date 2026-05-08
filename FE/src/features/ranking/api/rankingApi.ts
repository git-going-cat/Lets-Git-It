import { z } from 'zod';

import { http } from '@/core/http';

import {
  coopRankingResponseSchema,
  singleRankingResponseSchema,
  speedRankingResponseSchema,
  timeAttackRankingResponseSchema,
} from '../schemas/ranking.schema';

import type {
  CoopMyRank,
  CoopRankingEntry,
  CoopRankingQuery,
  RankingResponse,
  SingleMyRank,
  SingleRankingEntry,
  SpeedMyRank,
  SpeedRankingEntry,
  TimeAttackMyRank,
  TimeAttackRankingEntry,
  WeekParam,
} from '../types/ranking.types';

const DIFFICULTY_MAP = {
  'single-easy': 'EASY',
  'single-normal': 'NORMAL',
  'single-hard': 'HARD',
} as const;

const DEFAULT_PAGE_SIZE = 20;

type RankingQueryParams = Record<string, string | number | undefined>;
type SingleRankingCursor = {
  afterRank?: number;
  beforeRank?: number;
};

function buildRankingParams(params: RankingQueryParams, cursor?: number) {
  return {
    ...params,
    cursor,
    size: cursor === undefined ? undefined : DEFAULT_PAGE_SIZE,
  };
}

function buildSingleRankingParams(params: RankingQueryParams, cursor?: SingleRankingCursor) {
  return {
    ...params,
    afterRank: cursor?.afterRank,
    beforeRank: cursor?.beforeRank,
    size: cursor === undefined ? undefined : DEFAULT_PAGE_SIZE,
  };
}

async function getRanking<T>(
  path: string,
  params: RankingQueryParams,
  schema: z.ZodType<T>,
  errorMessage: string
): Promise<T> {
  const { data } = await http.get<unknown>(path, { params });
  const parsed = z.object({ message: z.string(), data: schema }).safeParse(data);

  if (!parsed.success) {
    throw new Error(errorMessage);
  }

  return parsed.data.data;
}

export async function fetchSingleRanking(
  difficulty: keyof typeof DIFFICULTY_MAP,
  cursor?: SingleRankingCursor
): Promise<RankingResponse<SingleRankingEntry, SingleMyRank>> {
  return getRanking(
    '/api/v1/rankings/single',
    buildSingleRankingParams({ difficulty: DIFFICULTY_MAP[difficulty] }, cursor),
    singleRankingResponseSchema,
    '올바르지 않은 싱글 랭킹 데이터 형식입니다.'
  );
}

export async function fetchSpeedRanking(
  cursor?: number
): Promise<RankingResponse<SpeedRankingEntry, SpeedMyRank>> {
  return getRanking(
    '/api/v1/rankings/speed',
    buildRankingParams({}, cursor),
    speedRankingResponseSchema,
    '올바르지 않은 기여도 랭킹 데이터 형식입니다.'
  );
}

export async function fetchTimeAttackRanking(
  cursor?: number
): Promise<RankingResponse<TimeAttackRankingEntry, TimeAttackMyRank>> {
  return getRanking(
    '/api/v1/rankings/timeattack',
    buildRankingParams({}, cursor),
    timeAttackRankingResponseSchema,
    '올바르지 않은 타임어택 랭킹 데이터 형식입니다.'
  );
}

export async function fetchCoopRanking(
  query: CoopRankingQuery,
  cursor?: number
): Promise<RankingResponse<CoopRankingEntry, CoopMyRank>> {
  return getRanking(
    '/api/v1/rankings/coop',
    buildRankingParams({ mapName: query.mapName, difficulty: query.difficulty }, cursor),
    coopRankingResponseSchema,
    '올바르지 않은 협력 랭킹 데이터 형식입니다.'
  );
}

export async function fetchSingleRankingHistory(
  difficulty: keyof typeof DIFFICULTY_MAP,
  weekParam: WeekParam,
  cursor?: SingleRankingCursor
): Promise<RankingResponse<SingleRankingEntry, SingleMyRank>> {
  return getRanking(
    '/api/v1/rankings/single/history',
    buildSingleRankingParams(
      {
        difficulty: DIFFICULTY_MAP[difficulty],
        year: weekParam.year,
        month: weekParam.month,
        week: weekParam.week,
      },
      cursor
    ),
    singleRankingResponseSchema,
    '올바르지 않은 싱글 과거 랭킹 데이터 형식입니다.'
  );
}

export async function fetchSpeedRankingHistory(
  weekParam: WeekParam,
  cursor?: number
): Promise<RankingResponse<SpeedRankingEntry, SpeedMyRank>> {
  return getRanking(
    '/api/v1/rankings/speed/history',
    buildRankingParams({ ...weekParam }, cursor),
    speedRankingResponseSchema,
    '올바르지 않은 기여도 과거 랭킹 데이터 형식입니다.'
  );
}

export async function fetchTimeAttackRankingHistory(
  weekParam: WeekParam,
  cursor?: number
): Promise<RankingResponse<TimeAttackRankingEntry, TimeAttackMyRank>> {
  return getRanking(
    '/api/v1/rankings/timeattack/history',
    buildRankingParams({ ...weekParam }, cursor),
    timeAttackRankingResponseSchema,
    '올바르지 않은 타임어택 과거 랭킹 데이터 형식입니다.'
  );
}

export async function fetchCoopRankingHistory(
  query: CoopRankingQuery,
  weekParam: WeekParam,
  cursor?: number
): Promise<RankingResponse<CoopRankingEntry, CoopMyRank>> {
  if (query.mapId === undefined) {
    throw new Error('협력 과거 랭킹 조회에는 mapId가 필요합니다.');
  }

  return getRanking(
    '/api/v1/rankings/coop/history',
    buildRankingParams({ mapId: query.mapId, ...weekParam }, cursor),
    coopRankingResponseSchema,
    '올바르지 않은 협력 과거 랭킹 데이터 형식입니다.'
  );
}
