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

import type {
  MyRank,
  RankingEntry,
  RankingMode,
  RankingResponse,
  WeekParam,
} from '../types/ranking.types';
import type { InfiniteData } from '@tanstack/react-query';

export function useRanking(mode: RankingMode, selectedWeek: WeekParam | null) {
  return useInfiniteQuery<
    RankingResponse<RankingEntry, MyRank>,
    Error,
    InfiniteData<RankingResponse<RankingEntry, MyRank>>,
    (string | WeekParam)[],
    number | undefined
  >({
    queryKey: ['ranking', mode, selectedWeek ?? 'current'],
    queryFn: ({ pageParam }): Promise<RankingResponse<RankingEntry, MyRank>> => {
      const cursor = pageParam as number | undefined;

      if (selectedWeek) {
        switch (mode) {
          case 'single-easy':
          case 'single-normal':
          case 'single-hard':
            return fetchSingleRankingHistory(mode, selectedWeek, cursor);
          case 'speed':
            return fetchSpeedRankingHistory(selectedWeek, cursor);
          case 'timeattack':
            return fetchTimeAttackRankingHistory(selectedWeek, cursor);
          case 'coop':
            return fetchCoopRankingHistory(selectedWeek, cursor);
        }
      }

      switch (mode) {
        case 'single-easy':
        case 'single-normal':
        case 'single-hard':
          return fetchSingleRanking(mode, cursor);
        case 'speed':
          return fetchSpeedRanking(cursor);
        case 'timeattack':
          return fetchTimeAttackRanking(cursor);
        case 'coop':
          return fetchCoopRanking(cursor);
      }
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.nextCursor : undefined),
  });
}
