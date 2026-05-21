import { MISS_SENTINEL_NICKNAME } from '../constants/score';

import type { ContributionPlayer, RankingEntry } from '../types/contribution.types';

/**
 * 게임 시작 시 초기 랭킹 배열을 생성한다.
 * 플레이어 수 + 1(miss sentinel)개 항목이 반환된다.
 */
export function buildInitialScores(
  players: ContributionPlayer[],
  myPlayerId: string | null
): RankingEntry[] {
  const scores: RankingEntry[] = players.map((p, i) => ({
    playerId: p.playerId,
    nickname: p.nickname,
    contribution: 0,
    rank: i + 1,
    isMe: p.playerId === myPlayerId,
  }));
  scores.push({
    playerId: null,
    nickname: MISS_SENTINEL_NICKNAME,
    contribution: 0,
    rank: scores.length + 1,
  });
  return scores;
}
