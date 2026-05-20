import { normalizeWeekParam } from './rankingFormat';
import { rankingQueryKey } from './rankingQueryKey';

import { SINGLE_RANKING_MODES, type WeekParam } from '../types/ranking.types';
import type { QueryClient } from '@tanstack/react-query';

/** 캐시된 싱글 랭킹 응답에서 이번 주차 정보를 찾습니다. */
export function getCachedSingleWeekInfo(queryClient: QueryClient) {
  for (const mode of SINGLE_RANKING_MODES) {
    const weekInfo = extractWeekInfo(queryClient.getQueryData(rankingQueryKey(mode, null)));
    if (weekInfo) return weekInfo;
  }

  return null;
}

/** InfiniteQuery 캐시 데이터에서 주차 정보를 추출합니다. */
export function extractWeekInfo(data: unknown): WeekParam | null {
  if (!isPageContainer(data)) return null;
  const weekPage = data.pages.find(isWeekPage);

  if (!weekPage) return null;
  return normalizeWeekParam({
    year: weekPage.year,
    month: weekPage.month,
    week: weekPage.week,
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
