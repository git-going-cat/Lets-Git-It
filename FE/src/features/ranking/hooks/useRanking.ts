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

import type {
  CoopRankingQuery,
  MyRank,
  RankingEntry,
  RankingMode,
  RankingResponse,
  WeekParam,
} from '../types/ranking.types';
import type { InfiniteData } from '@tanstack/react-query';

type RankingPageParam = {
  cursor?: number;
  direction?: 'next' | 'previous';
};

/** 싱글 랭킹 모드 여부를 판별합니다. */
function isSingleMode(mode: RankingMode) {
  return mode === 'single-easy' || mode === 'single-normal' || mode === 'single-hard';
}

function isAvailableSingleMode(mode: RankingMode) {
  return mode === 'single-easy' || mode === 'single-normal';
}

/** React Query pageParam을 싱글 랭킹 양방향 커서 파라미터로 변환합니다. */
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

/**
 * 선택한 랭킹 모드와 주차에 맞는 랭킹 목록을 무한 스크롤 쿼리로 조회합니다.
 */
export function useRanking(
  mode: RankingMode,
  selectedWeek: WeekParam | null,
  coopQuery?: CoopRankingQuery
) {
  const hasCoopQuery = Boolean(coopQuery?.mapName.trim() && coopQuery.difficulty);
  const isCoopHistoryReady = selectedWeek === null || coopQuery?.mapId !== undefined;
  const enabled = isAvailableSingleMode(mode) && (!hasCoopQuery || isCoopHistoryReady);

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
            return fetchSpeedRankingHistory(selectedWeek, cursor);
          case 'timeattack':
            return fetchTimeAttackRankingHistory(selectedWeek, cursor);
          case 'coop':
            if (!coopQuery) throw new Error('협력 랭킹 조회 조건이 없습니다.');
            return fetchCoopRankingHistory(coopQuery, selectedWeek, cursor);
        }
      }

      switch (mode) {
        case 'single-easy':
        case 'single-normal':
        case 'single-hard':
          return fetchSingleRanking(mode, toSingleCursor(pageParam));
        case 'speed':
          return fetchSpeedRanking(cursor);
        case 'timeattack':
          return fetchTimeAttackRanking(cursor);
        case 'coop':
          if (!coopQuery) throw new Error('협력 랭킹 조회 조건이 없습니다.');
          return fetchCoopRanking(coopQuery, cursor);
      }
    },
    initialPageParam: undefined as RankingPageParam | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext && lastPage.nextCursor !== null
        ? { cursor: lastPage.nextCursor, direction: 'next' }
        : lastPage.hasNext && getNoRecordNextCursor(lastPage) !== null
          ? { cursor: getNoRecordNextCursor(lastPage) ?? undefined, direction: 'next' }
          : undefined,
    getPreviousPageParam: (firstPage) =>
      isSingleMode(mode) && firstPage.hasPrev && typeof firstPage.prevCursor === 'number'
        ? { cursor: firstPage.prevCursor, direction: 'previous' }
        : undefined,
    enabled,
  });
}
