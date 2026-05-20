import { useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchCoopRanking,
  fetchCoopRankingHistory,
  fetchSingleRanking,
  fetchSingleRankingHistory,
  fetchSpeedRanking,
  fetchSpeedRankingHistory,
  fetchTimeAttackRanking,
  fetchTimeAttackRankingHistory,
} from '../api/rankingApi';
import { rankingQueryKey } from '../utils/rankingQueryKey';

import {
  type CoopRankingQuery,
  type MyRank,
  type RankingEntry,
  type RankingMode,
  type RankingResponse,
  SINGLE_RANKING_MODES,
  type SingleRankingMode,
  type WeekParam,
} from '../types/ranking.types';
import type { InfiniteData } from '@tanstack/react-query';

type RankingPageParam = {
  cursor?: number;
  direction?: 'next' | 'previous';
};

/** 싱글 랭킹 모드인지 판별합니다. */
function isSingleMode(mode: RankingMode): mode is SingleRankingMode {
  return SINGLE_RANKING_MODES.includes(mode as SingleRankingMode);
}

/** rank 기반 양방향 커서를 REST API 파라미터로 변환합니다. */
function toRankCursor(pageParam: RankingPageParam | undefined) {
  if (!pageParam?.cursor) return undefined;
  return pageParam.direction === 'previous'
    ? { beforeRank: pageParam.cursor }
    : { afterRank: pageParam.cursor };
}

/** 선택한 랭킹 모드와 주차에 맞는 랭킹 목록을 무한 스크롤 쿼리로 조회합니다. */
export function useRanking(
  mode: RankingMode,
  selectedWeek: WeekParam | null,
  coopQuery?: CoopRankingQuery
) {
  const hasCoopQuery = Boolean(coopQuery?.mapName.trim() && coopQuery.difficulty);
  const enabled = isSingleMode(mode) || mode === 'speed' || (mode === 'coop' && hasCoopQuery);

  return useInfiniteQuery<
    RankingResponse<RankingEntry, Exclude<MyRank, null>>,
    Error,
    InfiniteData<RankingResponse<RankingEntry, Exclude<MyRank, null>>>,
    ReturnType<typeof rankingQueryKey>,
    RankingPageParam | undefined
  >({
    queryKey: rankingQueryKey(mode, selectedWeek, coopQuery),
    queryFn: ({ pageParam }): Promise<RankingResponse<RankingEntry, Exclude<MyRank, null>>> => {
      const cursor = pageParam?.cursor;

      if (selectedWeek) {
        switch (mode) {
          case 'single-easy':
          case 'single-normal':
          case 'single-hard':
            return fetchSingleRankingHistory(mode, selectedWeek, toRankCursor(pageParam));
          case 'speed':
            return fetchSpeedRankingHistory(selectedWeek, toRankCursor(pageParam));
          case 'timeattack':
            return fetchTimeAttackRankingHistory(selectedWeek, cursor);
          case 'coop':
            if (!coopQuery) throw new Error('협력 랭킹 조회 조건이 없습니다.');
            return fetchCoopRankingHistory(coopQuery, selectedWeek, toRankCursor(pageParam));
        }
      }

      switch (mode) {
        case 'single-easy':
        case 'single-normal':
        case 'single-hard':
          return fetchSingleRanking(mode, toRankCursor(pageParam));
        case 'speed':
          return fetchSpeedRanking(toRankCursor(pageParam));
        case 'timeattack':
          return fetchTimeAttackRanking(cursor);
        case 'coop':
          if (!coopQuery) throw new Error('협력 랭킹 조회 조건이 없습니다.');
          return fetchCoopRanking(coopQuery, toRankCursor(pageParam));
      }
    },
    initialPageParam: undefined as RankingPageParam | undefined,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage.hasNext || typeof lastPage.nextCursor !== 'number') return undefined;
      if (lastPageParam?.direction === 'next' && lastPageParam.cursor === lastPage.nextCursor) {
        return undefined;
      }
      return { cursor: lastPage.nextCursor, direction: 'next' };
    },
    getPreviousPageParam: (firstPage, _allPages, firstPageParam) => {
      const supportsPrev = isSingleMode(mode) || mode === 'speed' || mode === 'coop';
      if (!supportsPrev || !firstPage.hasPrev || typeof firstPage.prevCursor !== 'number') {
        return undefined;
      }
      if (
        firstPageParam?.direction === 'previous' &&
        firstPageParam.cursor === firstPage.prevCursor
      ) {
        return undefined;
      }
      return { cursor: firstPage.prevCursor, direction: 'previous' };
    },
    refetchOnWindowFocus: false,
    enabled,
  });
}
