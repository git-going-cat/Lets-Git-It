import { useQuery } from '@tanstack/react-query';

import { fetchCoopRankingMaps } from '../api/rankingApi';

/**
 * 협력 랭킹 조회에 필요한 맵 목록을 가져옵니다.
 */
export function useCoopRankingMaps(enabled = true) {
  return useQuery({
    queryKey: ['ranking', 'coop-maps'],
    queryFn: fetchCoopRankingMaps,
    staleTime: Infinity,
    enabled,
  });
}
