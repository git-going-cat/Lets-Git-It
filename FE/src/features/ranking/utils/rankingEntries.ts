import type { MyRank, RankingEntry, RankingInitialResponse } from '../types/ranking.types';

export type InitialRankingPage = RankingInitialResponse<RankingEntry, Exclude<MyRank, null>>;

/** 랭킹 목록에서 rank 중복을 제거하고 오름차순으로 정렬합니다. */
export function mergeRankingEntries(entries: RankingEntry[]): RankingEntry[] {
  const rankingByRank = new Map<number, RankingEntry>();

  entries.forEach((entry) => {
    if (!rankingByRank.has(entry.rank)) {
      rankingByRank.set(entry.rank, entry);
    }
  });

  return [...rankingByRank.values()].sort((a, b) => a.rank - b.rank);
}

/** 이미 렌더링된 rank를 빠르게 조회하기 위한 Set을 생성합니다. */
export function createRankSet(entries: RankingEntry[]): Set<number> {
  return new Set(entries.map((entry) => entry.rank));
}

/** 초기 랭킹 응답(top3 + around + myRank) 페이지인지 판별합니다. */
export function isInitialRankingPage(page: unknown): page is InitialRankingPage {
  if (!isRecord(page)) return false;

  return Array.isArray(page.top3) && Array.isArray(page.around) && 'myRank' in page;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
