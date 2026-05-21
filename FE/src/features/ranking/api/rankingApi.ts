import { http } from '@/core/http';
import { apiResponseSchema } from '@/shared/schemas/response.schema';

import {
  coopRankingMapListResponseSchema,
  coopRankingResponseSchema,
  singleRankingResponseSchema,
  speedRankingResponseSchema,
  timeAttackRankingResponseSchema,
} from '../schemas/ranking.schema';

import type {
  CoopMyRank,
  CoopRankingEntry,
  CoopRankingMapListResponse,
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
import type { z } from 'zod';

const DIFFICULTY_MAP = {
  'single-easy': 'EASY',
  'single-normal': 'NORMAL',
  'single-hard': 'HARD',
} as const;

const DEFAULT_PAGE_SIZE = 20;

type RankingQueryParams = Record<string, string | number | undefined>;
type RankCursor = {
  afterRank?: number;
  beforeRank?: number;
};

function buildCursorParams(params: RankingQueryParams, cursor?: RankCursor) {
  return {
    ...params,
    afterRank: cursor?.afterRank,
    beforeRank: cursor?.beforeRank,
    size: cursor === undefined ? undefined : DEFAULT_PAGE_SIZE,
  };
}

function buildLegacyCursorParams(params: RankingQueryParams, cursor?: number) {
  return {
    ...params,
    cursor,
    size: cursor === undefined ? undefined : DEFAULT_PAGE_SIZE,
  };
}

async function getApiData<T>(
  path: string,
  params: RankingQueryParams,
  schema: z.ZodType<T>,
  errorMessage: string
): Promise<T> {
  const { data } = await http.get<unknown>(path, { params });
  try {
    return apiResponseSchema(schema).parse(data).data;
  } catch {
    throw new Error(errorMessage);
  }
}

export async function fetchCoopRankingMaps(): Promise<CoopRankingMapListResponse> {
  return getApiData(
    '/api/v1/rooms/coop/maps',
    {},
    coopRankingMapListResponseSchema,
    '올바르지 않은 협력 맵 목록 데이터 형식입니다.'
  );
}

export async function fetchSingleRanking(
  difficulty: keyof typeof DIFFICULTY_MAP,
  cursor?: RankCursor
): Promise<RankingResponse<SingleRankingEntry, SingleMyRank>> {
  return getApiData(
    '/api/v1/rankings/single',
    buildCursorParams({ difficulty: DIFFICULTY_MAP[difficulty] }, cursor),
    singleRankingResponseSchema,
    '올바르지 않은 싱글 랭킹 데이터 형식입니다.'
  );
}

export async function fetchSpeedRanking(
  cursor?: RankCursor
): Promise<RankingResponse<SpeedRankingEntry, SpeedMyRank>> {
  return getApiData(
    '/api/v1/rankings/contribution',
    buildCursorParams({}, cursor),
    speedRankingResponseSchema,
    '올바르지 않은 기여도 뺏기 랭킹 데이터 형식입니다.'
  );
}

export async function fetchTimeAttackRanking(
  cursor?: number
): Promise<RankingResponse<TimeAttackRankingEntry, TimeAttackMyRank>> {
  return getApiData(
    '/api/v1/rankings/timeattack',
    buildLegacyCursorParams({}, cursor),
    timeAttackRankingResponseSchema,
    '올바르지 않은 타임어택 랭킹 데이터 형식입니다.'
  );
}

export async function fetchCoopRanking(
  query: CoopRankingQuery,
  cursor?: RankCursor
): Promise<RankingResponse<CoopRankingEntry, CoopMyRank>> {
  return getApiData(
    '/api/v1/rankings/coop',
    buildCursorParams(
      { mapName: query.mapName, difficulty: query.difficulty, mapId: query.mapId },
      cursor
    ),
    coopRankingResponseSchema,
    '올바르지 않은 협력 랭킹 데이터 형식입니다.'
  );
}

export async function fetchSingleRankingHistory(
  difficulty: keyof typeof DIFFICULTY_MAP,
  weekParam: WeekParam,
  cursor?: RankCursor
): Promise<RankingResponse<SingleRankingEntry, SingleMyRank>> {
  return getApiData(
    '/api/v1/rankings/single/history',
    buildCursorParams(
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
  cursor?: RankCursor
): Promise<RankingResponse<SpeedRankingEntry, SpeedMyRank>> {
  return getApiData(
    '/api/v1/rankings/contribution/history',
    buildCursorParams({ ...weekParam }, cursor),
    speedRankingResponseSchema,
    '올바르지 않은 기여도 뺏기 과거 랭킹 데이터 형식입니다.'
  );
}

export async function fetchTimeAttackRankingHistory(
  weekParam: WeekParam,
  cursor?: number
): Promise<RankingResponse<TimeAttackRankingEntry, TimeAttackMyRank>> {
  return getApiData(
    '/api/v1/rankings/timeattack/history',
    buildLegacyCursorParams({ ...weekParam }, cursor),
    timeAttackRankingResponseSchema,
    '올바르지 않은 타임어택 과거 랭킹 데이터 형식입니다.'
  );
}

export async function fetchCoopRankingHistory(
  query: CoopRankingQuery,
  weekParam: WeekParam,
  cursor?: RankCursor
): Promise<RankingResponse<CoopRankingEntry, CoopMyRank>> {
  return getApiData(
    '/api/v1/rankings/coop/history',
    buildCursorParams(
      {
        ...weekParam,
        mapName: query.mapName,
        difficulty: query.difficulty,
        mapId: query.mapId,
      },
      cursor
    ),
    coopRankingResponseSchema,
    '올바르지 않은 협력 과거 랭킹 데이터 형식입니다.'
  );
}
