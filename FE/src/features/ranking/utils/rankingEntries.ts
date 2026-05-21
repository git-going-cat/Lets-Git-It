import type { MyRank, RankingEntry, RankingInitialResponse } from '../types/ranking.types';

export type InitialRankingPage = RankingInitialResponse<RankingEntry, Exclude<MyRank, null>>;

/** 랭킹 목록에서 같은 항목만 제거하고 오름차순으로 정렬합니다. */
export function mergeRankingEntries(entries: RankingEntry[]): RankingEntry[] {
  const rankingByKey = new Map<string, RankingEntry>();

  entries.forEach((entry) => {
    const key = getRankingEntryKey(entry);
    if (!rankingByKey.has(key)) {
      rankingByKey.set(key, entry);
    }
  });

  return [...rankingByKey.values()].sort((a, b) => a.rank - b.rank);
}

/** 이미 렌더링된 랭킹 항목을 빠르게 조회하기 위한 Set을 생성합니다. */
export function createRankSet(entries: RankingEntry[]): Set<string> {
  return new Set(entries.map(getRankingEntryKey));
}

/** 동일 순위가 허용되는 모드를 위해 rank 외 식별자를 함께 사용합니다. */
export function getRankingEntryKey(entry: RankingEntry): string {
  if ('teamName' in entry) return `${entry.rank}:coop:${entry.teamName}:${entry.mapName}`;
  if ('playerId' in entry) return `${entry.rank}:speed:${entry.playerId}`;
  if ('nickname' in entry) return `${entry.rank}:user:${entry.nickname}`;
  const exhaustiveCheck: never = entry;
  return String(exhaustiveCheck);
}

/** 초기 랭킹 응답(top3 + around + myRank) 페이지인지 판별합니다. */
export function isInitialRankingPage(page: unknown): page is InitialRankingPage {
  if (!isRecord(page)) return false;

  return Array.isArray(page.top3) && Array.isArray(page.around) && 'myRank' in page;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
