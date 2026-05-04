import {
  coopRankingResponseSchema,
  rankingWindowResponseSchema,
  singleRankingResponseSchema,
  speedRankingResponseSchema,
  timeAttackRankingResponseSchema,
} from '../schemas/ranking.schema';

import type {
  CoopMyRank,
  CoopRankingEntry,
  RankingEntry,
  RankingInfiniteResponse,
  RankingMode,
  RankingResponse,
  SingleMyRank,
  SingleRankingEntry,
  SpeedMyRank,
  SpeedRankingEntry,
  TimeAttackMyRank,
  TimeAttackRankingEntry,
  WeekParam,
} from '../types/ranking.types';

// ── Mock Helper ───────────────────────────────────────────

type MockMode = 'single' | 'speed' | 'timeattack' | 'coop';
type RankingWindowDirection = 'upper' | 'lower';

interface RankingWindowRequest {
  mode: RankingMode;
  selectedWeek: WeekParam | null;
  direction: RankingWindowDirection;
  cursor: number;
}

interface RankingWindowResponse {
  rankings: RankingEntry[];
  nextCursor: number | null;
  hasNext: boolean;
}

const MOCK_SCORE_STEP = 100;
const MOCK_COOP_TIME_STEP = 2000;

function getMockValue(rankOneValue: number, rank: number, mode: MockMode) {
  const step = mode === 'coop' ? MOCK_COOP_TIME_STEP : MOCK_SCORE_STEP;
  const offset = (rank - 1) * step;
  return mode === 'coop' ? rankOneValue + offset : Math.max(0, rankOneValue - offset);
}

function createSingleEntry(
  rank: number,
  nickname: string,
  rankOneScore: number
): SingleRankingEntry {
  return { rank, nickname, score: getMockValue(rankOneScore, rank, 'single') };
}

function createSpeedEntry(
  rank: number,
  nickname: string,
  rankOneContribution: number
): SpeedRankingEntry {
  return { rank, nickname, contribution: getMockValue(rankOneContribution, rank, 'speed') };
}

function createTimeAttackEntry(
  rank: number,
  nickname: string,
  rankOneTotalCount: number
): TimeAttackRankingEntry {
  return { rank, nickname, totalCount: getMockValue(rankOneTotalCount, rank, 'timeattack') };
}

function createCoopEntry(
  rank: number,
  nickname: string,
  rankOneClearTime: number
): CoopRankingEntry {
  return { rank, nickname, clearTime: getMockValue(rankOneClearTime, rank, 'coop') };
}

function generateMockRankings(
  rankOneValue: number,
  mode: MockMode,
  cursor: number = 3
): RankingInfiniteResponse<RankingEntry> {
  const rankings: RankingEntry[] = [];
  const start = cursor + 1;
  const end = Math.min(start + 19, 50); // 50위까지만 데이터 제공

  for (let i = start; i <= end; i++) {
    const nickname = `user${i}`;
    if (mode === 'single') {
      rankings.push(createSingleEntry(i, nickname, rankOneValue));
    } else if (mode === 'speed') {
      rankings.push(createSpeedEntry(i, nickname, rankOneValue));
    } else if (mode === 'timeattack') {
      rankings.push(createTimeAttackEntry(i, nickname, rankOneValue));
    } else {
      rankings.push(createCoopEntry(i, nickname, rankOneValue));
    }
  }

  return {
    rankings,
    nextCursor: end < 50 ? end : null,
    hasNext: end < 50,
  };
}

function getMockMode(mode: RankingMode): MockMode {
  if (mode === 'speed') return 'speed';
  if (mode === 'timeattack') return 'timeattack';
  if (mode === 'coop') return 'coop';
  return 'single';
}

function getRankOneValue(mode: RankingMode, selectedWeek: WeekParam | null) {
  const isHistory = selectedWeek !== null;

  if (mode === 'speed') return isHistory ? 11500 : 12000;
  if (mode === 'timeattack') return isHistory ? 14500 : 15000;
  if (mode === 'coop') return isHistory ? 63000 : 61000;
  if (mode === 'single-easy') return isHistory ? 9000 : 9800;
  if (mode === 'single-normal') return isHistory ? 8000 : 8800;
  return isHistory ? 7000 : 7800;
}

function createRankingEntry(
  mode: RankingMode,
  rank: number,
  nickname: string,
  selectedWeek: WeekParam | null
) {
  const mockMode = getMockMode(mode);
  const rankOneValue = getRankOneValue(mode, selectedWeek);

  if (mockMode === 'speed') return createSpeedEntry(rank, nickname, rankOneValue);
  if (mockMode === 'timeattack') return createTimeAttackEntry(rank, nickname, rankOneValue);
  if (mockMode === 'coop') return createCoopEntry(rank, nickname, rankOneValue);
  return createSingleEntry(rank, nickname, rankOneValue);
}

function generateRankingWindow({
  mode,
  selectedWeek,
  direction,
  cursor,
}: RankingWindowRequest): RankingWindowResponse {
  const top3LastRank = 3;
  const maxRank = 50;
  const windowSize = 20;
  const rankings: RankingEntry[] = [];

  if (direction === 'upper') {
    const endRank = cursor - 1;
    const startRank = Math.max(top3LastRank + 1, endRank - windowSize + 1);

    for (let rank = startRank; rank <= endRank; rank++) {
      rankings.push(createRankingEntry(mode, rank, `user${rank}`, selectedWeek));
    }

    return {
      rankings,
      nextCursor: rankings.length > 0 ? startRank : null,
      hasNext: startRank > top3LastRank + 1,
    };
  }

  const startRank = cursor + 1;
  const endRank = Math.min(startRank + windowSize - 1, maxRank);

  for (let rank = startRank; rank <= endRank; rank++) {
    rankings.push(createRankingEntry(mode, rank, `user${rank}`, selectedWeek));
  }

  return {
    rankings,
    nextCursor: rankings.length > 0 ? endRank : null,
    hasNext: endRank < maxRank,
  };
}

// ── Mock: 싱글 ────────────────────────────────────────────

function generateSingleMock(
  difficulty: string,
  cursor?: number
): RankingResponse<SingleRankingEntry, SingleMyRank> {
  const rankOneScore = difficulty === 'EASY' ? 9800 : difficulty === 'NORMAL' ? 8800 : 7800;

  if (cursor !== undefined) {
    return generateMockRankings(
      rankOneScore,
      'single',
      cursor
    ) as RankingInfiniteResponse<SingleRankingEntry>;
  }

  return {
    year: 2026,
    month: 5,
    week: 1,
    top3: [
      createSingleEntry(1, 'gitmaster', rankOneScore),
      createSingleEntry(2, 'branchking', rankOneScore),
      createSingleEntry(3, 'mergelord', rankOneScore),
    ],
    myRank: { rank: 42, score: getMockValue(rankOneScore, 42, 'single') },
    around: [
      createSingleEntry(40, 'user40', rankOneScore),
      createSingleEntry(41, 'user41', rankOneScore),
      createSingleEntry(42, 'dobby', rankOneScore),
      createSingleEntry(43, 'user43', rankOneScore),
      createSingleEntry(44, 'user44', rankOneScore),
    ],
    nextCursor: 44,
    hasNext: true,
  };
}

// ── Mock: 기여도 뺏기 ─────────────────────────────────────

function generateSpeedMock(cursor?: number): RankingResponse<SpeedRankingEntry, SpeedMyRank> {
  const rankOneContribution = 12000;
  if (cursor !== undefined) {
    return generateMockRankings(
      rankOneContribution,
      'speed',
      cursor
    ) as RankingInfiniteResponse<SpeedRankingEntry>;
  }

  return {
    year: 2026,
    month: 5,
    week: 1,
    top3: [
      createSpeedEntry(1, 'speedking', rankOneContribution),
      createSpeedEntry(2, 'fastuser', rankOneContribution),
      createSpeedEntry(3, 'quickdraw', rankOneContribution),
    ],
    myRank: { rank: 15, contribution: getMockValue(rankOneContribution, 15, 'speed') },
    around: [
      createSpeedEntry(13, 'user13', rankOneContribution),
      createSpeedEntry(14, 'user14', rankOneContribution),
      createSpeedEntry(15, 'dobby', rankOneContribution),
      createSpeedEntry(16, 'user16', rankOneContribution),
      createSpeedEntry(17, 'user17', rankOneContribution),
    ],
    nextCursor: 17,
    hasNext: true,
  };
}

// ── Mock: 타임어택 ────────────────────────────────────────

function generateTimeAttackMock(
  cursor?: number
): RankingResponse<TimeAttackRankingEntry, TimeAttackMyRank> {
  const rankOneTotalCount = 15000;
  if (cursor !== undefined) {
    return generateMockRankings(
      rankOneTotalCount,
      'timeattack',
      cursor
    ) as RankingInfiniteResponse<TimeAttackRankingEntry>;
  }

  return {
    year: 2026,
    month: 5,
    week: 1,
    top3: [
      createTimeAttackEntry(1, 'timemaster', rankOneTotalCount),
      createTimeAttackEntry(2, 'clockking', rankOneTotalCount),
      createTimeAttackEntry(3, 'ticktock', rankOneTotalCount),
    ],
    myRank: { rank: 7, totalCount: getMockValue(rankOneTotalCount, 7, 'timeattack') },
    around: [
      createTimeAttackEntry(5, 'user5', rankOneTotalCount),
      createTimeAttackEntry(6, 'user6', rankOneTotalCount),
      createTimeAttackEntry(7, 'dobby', rankOneTotalCount),
      createTimeAttackEntry(8, 'user8', rankOneTotalCount),
      createTimeAttackEntry(9, 'user9', rankOneTotalCount),
    ],
    nextCursor: 9,
    hasNext: true,
  };
}

// ── Mock: 협력 ────────────────────────────────────────────

function generateCoopMock(cursor?: number): RankingResponse<CoopRankingEntry, CoopMyRank> {
  const rankOneClearTime = 61000;
  if (cursor !== undefined) {
    return generateMockRankings(
      rankOneClearTime,
      'coop',
      cursor
    ) as RankingInfiniteResponse<CoopRankingEntry>;
  }

  return {
    year: 2026,
    month: 5,
    week: 1,
    top3: [
      createCoopEntry(1, 'coopmaster', rankOneClearTime),
      createCoopEntry(2, 'teamwork', rankOneClearTime),
      createCoopEntry(3, 'syncpro', rankOneClearTime),
    ],
    myRank: { rank: 5, clearTime: getMockValue(rankOneClearTime, 5, 'coop') },
    around: [
      createCoopEntry(3, 'user3', rankOneClearTime),
      createCoopEntry(4, 'user4', rankOneClearTime),
      createCoopEntry(5, 'dobby', rankOneClearTime),
      createCoopEntry(6, 'user6', rankOneClearTime),
      createCoopEntry(7, 'user7', rankOneClearTime),
    ],
    nextCursor: 7,
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
  const raw = generateSingleMock(DIFFICULTY_MAP[difficulty] ?? difficulty, cursor);
  return singleRankingResponseSchema.parse(raw);
}

export async function fetchSpeedRanking(cursor?: number) {
  await delay(300);
  const raw = generateSpeedMock(cursor);
  return speedRankingResponseSchema.parse(raw);
}

export async function fetchTimeAttackRanking(cursor?: number) {
  await delay(300);
  const raw = generateTimeAttackMock(cursor);
  return timeAttackRankingResponseSchema.parse(raw);
}

export async function fetchCoopRanking(cursor?: number) {
  await delay(300);
  const raw = generateCoopMock(cursor);
  return coopRankingResponseSchema.parse(raw);
}

// ── History Mock Generators ───────────────────────────────

function generateSingleHistoryMock(
  difficulty: string,
  weekParam: WeekParam,
  cursor?: number
): RankingResponse<SingleRankingEntry, SingleMyRank> {
  const rankOneScore = difficulty === 'EASY' ? 9000 : difficulty === 'NORMAL' ? 8000 : 7000;

  if (cursor !== undefined) {
    return generateMockRankings(
      rankOneScore,
      'single',
      cursor
    ) as RankingInfiniteResponse<SingleRankingEntry>;
  }

  return {
    year: weekParam.year,
    month: weekParam.month,
    week: weekParam.week,
    top3: [
      createSingleEntry(1, 'histgit', rankOneScore),
      createSingleEntry(2, 'histbranch', rankOneScore),
      createSingleEntry(3, 'histmerge', rankOneScore),
    ],
    myRank: { rank: 42, score: getMockValue(rankOneScore, 42, 'single') },
    around: [
      createSingleEntry(40, 'hist40', rankOneScore),
      createSingleEntry(41, 'hist41', rankOneScore),
      createSingleEntry(42, 'dobby', rankOneScore),
      createSingleEntry(43, 'hist43', rankOneScore),
      createSingleEntry(44, 'hist44', rankOneScore),
    ],
    nextCursor: 44,
    hasNext: true,
  };
}

function generateSpeedHistoryMock(
  weekParam: WeekParam,
  cursor?: number
): RankingResponse<SpeedRankingEntry, SpeedMyRank> {
  const rankOneContribution = 11500;

  if (cursor !== undefined) {
    return generateMockRankings(
      rankOneContribution,
      'speed',
      cursor
    ) as RankingInfiniteResponse<SpeedRankingEntry>;
  }

  return {
    year: weekParam.year,
    month: weekParam.month,
    week: weekParam.week,
    top3: [
      createSpeedEntry(1, 'histspeed', rankOneContribution),
      createSpeedEntry(2, 'histfast', rankOneContribution),
      createSpeedEntry(3, 'histquick', rankOneContribution),
    ],
    myRank: { rank: 15, contribution: getMockValue(rankOneContribution, 15, 'speed') },
    around: [
      createSpeedEntry(13, 'hist13', rankOneContribution),
      createSpeedEntry(14, 'hist14', rankOneContribution),
      createSpeedEntry(15, 'dobby', rankOneContribution),
      createSpeedEntry(16, 'hist16', rankOneContribution),
      createSpeedEntry(17, 'hist17', rankOneContribution),
    ],
    nextCursor: 17,
    hasNext: true,
  };
}

function generateTimeAttackHistoryMock(
  weekParam: WeekParam,
  cursor?: number
): RankingResponse<TimeAttackRankingEntry, TimeAttackMyRank> {
  const rankOneTotalCount = 14500;

  if (cursor !== undefined) {
    return generateMockRankings(
      rankOneTotalCount,
      'timeattack',
      cursor
    ) as RankingInfiniteResponse<TimeAttackRankingEntry>;
  }

  return {
    year: weekParam.year,
    month: weekParam.month,
    week: weekParam.week,
    top3: [
      createTimeAttackEntry(1, 'histtime', rankOneTotalCount),
      createTimeAttackEntry(2, 'histclock', rankOneTotalCount),
      createTimeAttackEntry(3, 'histtick', rankOneTotalCount),
    ],
    myRank: { rank: 7, totalCount: getMockValue(rankOneTotalCount, 7, 'timeattack') },
    around: [
      createTimeAttackEntry(5, 'hist5', rankOneTotalCount),
      createTimeAttackEntry(6, 'hist6', rankOneTotalCount),
      createTimeAttackEntry(7, 'dobby', rankOneTotalCount),
      createTimeAttackEntry(8, 'hist8', rankOneTotalCount),
      createTimeAttackEntry(9, 'hist9', rankOneTotalCount),
    ],
    nextCursor: 9,
    hasNext: true,
  };
}

function generateCoopHistoryMock(
  weekParam: WeekParam,
  cursor?: number
): RankingResponse<CoopRankingEntry, CoopMyRank> {
  const rankOneClearTime = 63000;

  if (cursor !== undefined) {
    return generateMockRankings(
      rankOneClearTime,
      'coop',
      cursor
    ) as RankingInfiniteResponse<CoopRankingEntry>;
  }

  return {
    year: weekParam.year,
    month: weekParam.month,
    week: weekParam.week,
    top3: [
      createCoopEntry(1, 'histcoop', rankOneClearTime),
      createCoopEntry(2, 'histteam', rankOneClearTime),
      createCoopEntry(3, 'histsync', rankOneClearTime),
    ],
    myRank: { rank: 5, clearTime: getMockValue(rankOneClearTime, 5, 'coop') },
    around: [
      createCoopEntry(3, 'hist3', rankOneClearTime),
      createCoopEntry(4, 'hist4', rankOneClearTime),
      createCoopEntry(5, 'dobby', rankOneClearTime),
      createCoopEntry(6, 'hist6', rankOneClearTime),
      createCoopEntry(7, 'hist7', rankOneClearTime),
    ],
    nextCursor: 7,
    hasNext: true,
  };
}

// ── History API 함수 (mock 반환 → API 연동 시 queryFn만 교체) ──

// TODO: API 연동 시 실제 fetch 호출로 교체
export async function fetchSingleRankingHistory(
  difficulty: string,
  weekParam: WeekParam,
  cursor?: number
) {
  await delay(300);
  const raw = generateSingleHistoryMock(
    DIFFICULTY_MAP[difficulty] ?? difficulty,
    weekParam,
    cursor
  );
  return singleRankingResponseSchema.parse(raw);
}

export async function fetchSpeedRankingHistory(weekParam: WeekParam, cursor?: number) {
  await delay(300);
  const raw = generateSpeedHistoryMock(weekParam, cursor);
  return speedRankingResponseSchema.parse(raw);
}

export async function fetchTimeAttackRankingHistory(weekParam: WeekParam, cursor?: number) {
  await delay(300);
  const raw = generateTimeAttackHistoryMock(weekParam, cursor);
  return timeAttackRankingResponseSchema.parse(raw);
}

export async function fetchCoopRankingHistory(weekParam: WeekParam, cursor?: number) {
  await delay(300);
  const raw = generateCoopHistoryMock(weekParam, cursor);
  return coopRankingResponseSchema.parse(raw);
}

// TODO: BE 협의 필요 - 현재 명세에는 내 순위 기준 위/아래 방향 페이지 조회 API가 없어 mock으로만 제공
// TODO: BE 협의 필요 - 위 방향 커서 기반 조회 API 미존재
export async function fetchRankingWindow(
  mode: RankingMode,
  cursor: number,
  direction: RankingWindowDirection,
  selectedWeek: WeekParam | null
): Promise<RankingWindowResponse> {
  await delay(300);
  const raw = generateRankingWindow({ mode, cursor, direction, selectedWeek });
  return rankingWindowResponseSchema.parse(raw);
}

/** 네트워크 지연 시뮬레이션 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
