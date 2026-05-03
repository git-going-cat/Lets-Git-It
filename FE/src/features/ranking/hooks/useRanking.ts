import { useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchCoopRanking,
  fetchSingleRanking,
  fetchSpeedRanking,
  fetchTimeAttackRanking,
} from '../api/rankingApi';

import type { RankingMode } from '../types/ranking.types';

/**
 * 모드별 랭킹 데이터를 조회하는 TanStack Query 훅
 *
 * @description queryFn 내부에서 모드별 API 함수를 분기 호출.
 *              useInfiniteQuery로 무한 스크롤 지원.
 */
export function useRanking(mode: RankingMode) {
  return useInfiniteQuery({
    queryKey: ['ranking', mode],
    queryFn: ({ pageParam }) => {
      switch (mode) {
        case 'single-easy':
        case 'single-normal':
        case 'single-hard':
          return fetchSingleRanking(mode, pageParam as number | undefined);
        case 'speed':
          return fetchSpeedRanking(pageParam as number | undefined);
        case 'timeattack':
          return fetchTimeAttackRanking(pageParam as number | undefined);
        case 'coop':
          return fetchCoopRanking(pageParam as number | undefined);
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.nextCursor : undefined),
  });
}
