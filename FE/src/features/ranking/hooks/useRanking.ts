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

function isSingleMode(mode: RankingMode): mode is SingleRankingMode {
  return SINGLE_RANKING_MODES.includes(mode as SingleRankingMode);
}

function toSingleCursor(pageParam: RankingPageParam | undefined) {
  if (!pageParam?.cursor) return undefined;
  return pageParam.direction === 'previous'
    ? { beforeRank: pageParam.cursor }
    : { afterRank: pageParam.cursor };
}

function getNoRecordNextCursor(page: RankingResponse<RankingEntry, Exclude<MyRank, null>>) {
  if (!('top3' in page) || page.myRank !== null || page.around.length > 0) return null;
  return page.top3[page.top3.length - 1]?.rank ?? null;
}

function hasPageParamBeenRequested(
  pageParams: (RankingPageParam | undefined)[],
  cursor: number,
  direction: RankingPageParam['direction']
) {
  return pageParams.some(
    (pageParam) => pageParam?.cursor === cursor && pageParam.direction === direction
  );
}

/**
 * 선택한 랭킹 모드와 주차에 맞는 랭킹 목록을 무한 스크롤 쿼리로 조회한다.
 */
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
            return fetchSingleRankingHistory(mode, selectedWeek, toSingleCursor(pageParam));
          case 'speed':
            return fetchSpeedRankingHistory(selectedWeek, toSingleCursor(pageParam));
          case 'timeattack':
            return fetchTimeAttackRankingHistory(selectedWeek, cursor);
          case 'coop':
            if (!coopQuery) throw new Error('협력 랭킹 조회 조건이 없습니다.');
            return fetchCoopRankingHistory(coopQuery, selectedWeek, toSingleCursor(pageParam));
        }
      }

      switch (mode) {
        case 'single-easy':
        case 'single-normal':
        case 'single-hard':
          return fetchSingleRanking(mode, toSingleCursor(pageParam));
        case 'speed':
          return fetchSpeedRanking(toSingleCursor(pageParam));
        case 'timeattack':
          return fetchTimeAttackRanking(cursor);
        case 'coop':
          if (!coopQuery) throw new Error('협력 랭킹 조회 조건이 없습니다.');
          return fetchCoopRanking(coopQuery, toSingleCursor(pageParam));
      }
    },
    initialPageParam: undefined as RankingPageParam | undefined,
    getNextPageParam: (lastPage, _allPages, _lastPageParam, allPageParams) => {
      if (!lastPage.hasNext) return undefined;
      if (lastPage.nextCursor !== null) {
        if (hasPageParamBeenRequested(allPageParams, lastPage.nextCursor, 'next')) {
          return undefined;
        }
        return { cursor: lastPage.nextCursor, direction: 'next' };
      }

      const noRecordCursor = getNoRecordNextCursor(lastPage);
      return noRecordCursor !== null &&
        !hasPageParamBeenRequested(allPageParams, noRecordCursor, 'next')
        ? { cursor: noRecordCursor, direction: 'next' }
        : undefined;
    },
    getPreviousPageParam: (firstPage, _allPages, _firstPageParam, allPageParams) => {
      if (
        !firstPage.hasPrev ||
        typeof firstPage.prevCursor !== 'number' ||
        hasPageParamBeenRequested(allPageParams, firstPage.prevCursor, 'previous')
      ) {
        return undefined;
      }

      return { cursor: firstPage.prevCursor, direction: 'previous' };
    },
    refetchOnWindowFocus: false,
    enabled,
  });
}
