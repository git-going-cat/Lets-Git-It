import { normalizeWeekParam } from './rankingFormat';
import { rankingQueryKey } from './rankingQueryKey';

import type { WeekParam } from '../types/ranking.types';
import type { QueryClient } from '@tanstack/react-query';

/** 캐시된 싱글 랭킹 응답에서 이번 주차 정보를 찾습니다. */
export function getCachedSingleWeekInfo(queryClient: QueryClient) {
  return (
    extractWeekInfo(queryClient.getQueryData(rankingQueryKey('single-easy', null))) ??
    extractWeekInfo(queryClient.getQueryData(rankingQueryKey('single-normal', null)))
  );
}

/** InfiniteQuery 캐시 데이터에서 주차 정보를 추출합니다. */
export function extractWeekInfo(data: unknown): WeekParam | null {
  if (!isPageContainer(data)) return null;
  const firstPage = data.pages[0];

  if (!isWeekPage(firstPage)) return null;
  return normalizeWeekParam({
    year: firstPage.year,
    month: firstPage.month,
    week: firstPage.week,
  });
}

function isPageContainer(data: unknown): data is { pages: unknown[] } {
  return typeof data === 'object' && data !== null && 'pages' in data && Array.isArray(data.pages);
}

function isWeekPage(data: unknown): data is WeekParam {
  return (
    typeof data === 'object' &&
    data !== null &&
    'year' in data &&
    'month' in data &&
    'week' in data &&
    typeof data.year === 'number' &&
    typeof data.month === 'number' &&
    typeof data.week === 'number'
  );
}
