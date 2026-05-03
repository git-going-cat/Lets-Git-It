import type {
  CoopMyRank,
  CoopRankingEntry,
  RankingInfiniteResponse,
  RankingResponse,
  SingleMyRank,
  SingleRankingEntry,
  SpeedMyRank,
  SpeedRankingEntry,
  TimeAttackMyRank,
  TimeAttackRankingEntry,
} from '../types/ranking.types';

// ── Mock Helper ───────────────────────────────────────────

function generateMockRankings(baseScore: number, mode: string, cursor: number = 4) {
  const rankings: Record<string, unknown>[] = [];
  const start = cursor;
  const end = Math.min(start + 20, 51); // 50위까지만 데이터 제공

  for (let i = start; i < end; i++) {
    const entry: Record<string, unknown> = { rank: i, nickname: `user${i}` };
    if (mode === 'single') entry.score = baseScore - Math.floor(i * 10);
    else if (mode === 'speed') entry.contribution = baseScore - Math.floor(i * 10);
    else if (mode === 'timeattack') entry.totalCount = baseScore - Math.floor(i * 10);
    else if (mode === 'coop') entry.clearTime = baseScore + Math.floor(i * 1000);
    rankings.push(entry);
  }

  return {
    rankings,
    nextCursor: end < 51 ? end : null,
    hasNext: end < 51,
  };
}

// ── Mock: 싱글 ────────────────────────────────────────────

function generateSingleMock(
  difficulty: string,
  cursor?: number
): RankingResponse<SingleRankingEntry, SingleMyRank> {
  const baseScore = difficulty === 'EASY' ? 8000 : difficulty === 'NORMAL' ? 7000 : 6000;

  if (cursor !== undefined) {
    return generateMockRankings(
      baseScore,
      'single',
      cursor
    ) as RankingInfiniteResponse<SingleRankingEntry>;
  }

  return {
    year: 2026,
    month: 5,
    week: 1,
    top3: [
      { rank: 1, nickname: 'gitmaster', score: baseScore + 1800 },
      { rank: 2, nickname: 'branchking', score: baseScore + 1200 },
      { rank: 3, nickname: 'mergelord', score: baseScore + 700 },
    ],
    myRank: { rank: 42, score: baseScore },
    around: [
      { rank: 40, nickname: 'user40', score: baseScore + 200 },
      { rank: 41, nickname: 'user41', score: baseScore + 100 },
      { rank: 42, nickname: 'dobby', score: baseScore },
      { rank: 43, nickname: 'user43', score: baseScore - 100 },
      { rank: 44, nickname: 'user44', score: baseScore - 200 },
    ],
    nextCursor: 4,
    hasNext: true,
  };
}

// ── Mock: 기여도 뺏기 ─────────────────────────────────────

function generateSpeedMock(cursor?: number): RankingResponse<SpeedRankingEntry, SpeedMyRank> {
  const baseScore = 9000;
  if (cursor !== undefined) {
    return generateMockRankings(
      baseScore,
      'speed',
      cursor
    ) as RankingInfiniteResponse<SpeedRankingEntry>;
  }

  return {
    year: 2026,
    month: 5,
    week: 1,
    top3: [
      { rank: 1, nickname: 'speedking', contribution: 12000 },
      { rank: 2, nickname: 'fastuser', contribution: 11500 },
      { rank: 3, nickname: 'quickdraw', contribution: 10900 },
    ],
    myRank: { rank: 15, contribution: 8800 },
    around: [
      { rank: 13, nickname: 'user13', contribution: 9100 },
      { rank: 14, nickname: 'user14', contribution: 8900 },
      { rank: 15, nickname: 'dobby', contribution: 8800 },
      { rank: 16, nickname: 'user16', contribution: 8600 },
      { rank: 17, nickname: 'user17', contribution: 8400 },
    ],
    nextCursor: 4,
    hasNext: true,
  };
}

// ── Mock: 타임어택 ────────────────────────────────────────

function generateTimeAttackMock(
  cursor?: number
): RankingResponse<TimeAttackRankingEntry, TimeAttackMyRank> {
  const baseScore = 11000;
  if (cursor !== undefined) {
    return generateMockRankings(
      baseScore,
      'timeattack',
      cursor
    ) as RankingInfiniteResponse<TimeAttackRankingEntry>;
  }

  return {
    year: 2026,
    month: 5,
    week: 1,
    top3: [
      { rank: 1, nickname: 'timemaster', totalCount: 15000 },
      { rank: 2, nickname: 'clockking', totalCount: 14200 },
      { rank: 3, nickname: 'ticktock', totalCount: 13800 },
    ],
    myRank: { rank: 7, totalCount: 10500 },
    around: [
      { rank: 5, nickname: 'user5', totalCount: 11000 },
      { rank: 6, nickname: 'user6', totalCount: 10700 },
      { rank: 7, nickname: 'dobby', totalCount: 10500 },
      { rank: 8, nickname: 'user8', totalCount: 10200 },
      { rank: 9, nickname: 'user9', totalCount: 10000 },
    ],
    nextCursor: 4,
    hasNext: true,
  };
}

// ── Mock: 협력 ────────────────────────────────────────────

function generateCoopMock(cursor?: number): RankingResponse<CoopRankingEntry, CoopMyRank> {
  const baseScore = 75000;
  if (cursor !== undefined) {
    return generateMockRankings(
      baseScore,
      'coop',
      cursor
    ) as RankingInfiniteResponse<CoopRankingEntry>;
  }

  return {
    year: 2026,
    month: 5,
    week: 1,
    top3: [
      { rank: 1, nickname: 'coopmaster', clearTime: 61000 },
      { rank: 2, nickname: 'teamwork', clearTime: 65000 },
      { rank: 3, nickname: 'syncpro', clearTime: 70000 },
    ],
    myRank: { rank: 5, clearTime: 83000 },
    around: [
      { rank: 3, nickname: 'user3', clearTime: 79000 },
      { rank: 4, nickname: 'user4', clearTime: 81000 },
      { rank: 5, nickname: 'dobby', clearTime: 83000 },
      { rank: 6, nickname: 'user6', clearTime: 85000 },
      { rank: 7, nickname: 'user7', clearTime: 87000 },
    ],
    nextCursor: 4,
    hasNext: true,
  };
}

// ── API 함수 (mock 반환 → API 연동 시 queryFn만 교체) ────

const DIFFICULTY_MAP: Record<string, string> = {
  'single-easy': 'EASY',
  'single-normal': 'NORMAL',
  'single-hard': 'HARD',
};

// TODO: API 연동 시 실제 fetch 호출로 교체
export async function fetchSingleRanking(difficulty: string, cursor?: number) {
  await delay(300);
  return generateSingleMock(DIFFICULTY_MAP[difficulty] ?? difficulty, cursor);
}

export async function fetchSpeedRanking(cursor?: number) {
  await delay(300);
  return generateSpeedMock(cursor);
}

export async function fetchTimeAttackRanking(cursor?: number) {
  await delay(300);
  return generateTimeAttackMock(cursor);
}

export async function fetchCoopRanking(cursor?: number) {
  await delay(300);
  return generateCoopMock(cursor);
}

/** 네트워크 지연 시뮬레이션 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
