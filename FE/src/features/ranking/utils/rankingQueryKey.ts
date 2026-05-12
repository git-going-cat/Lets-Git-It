import type { CoopRankingQuery, RankingMode, WeekParam } from '../types/ranking.types';

type RankingWeekScope = 'current' | 'history';

function normalizeCoopQuery(coopQuery?: CoopRankingQuery) {
  if (!coopQuery) return null;
  return {
    mapName: coopQuery.mapName,
    difficulty: coopQuery.difficulty,
    mapId: coopQuery.mapId ?? null,
  };
}

/** 랭킹 쿼리 캐시 키를 현재/과거와 협력 조건까지 명시적으로 구성합니다. */
export function rankingQueryKey(
  mode: RankingMode,
  selectedWeek: WeekParam | null,
  coopQuery?: CoopRankingQuery
) {
  const scope: RankingWeekScope = selectedWeek ? 'history' : 'current';

  return [
    'ranking',
    mode,
    scope,
    selectedWeek ?? null,
    mode === 'coop' ? normalizeCoopQuery(coopQuery) : null,
  ] as const;
}
