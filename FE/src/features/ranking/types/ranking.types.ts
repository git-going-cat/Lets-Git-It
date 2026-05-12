// ── 주차 파라미터 ──────────────────────────────────────────

export interface WeekParam {
  year: number;
  month: number;
  week: number;
}

// ── 모드 타입 ──────────────────────────────────────────────

export type RankingMode =
  | 'single-easy'
  | 'single-normal'
  | 'single-hard'
  | 'speed'
  | 'timeattack'
  | 'coop';

// ── 엔트리 타입 (REST API 응답 기준) ──────────────────────

export interface SingleRankingEntry {
  rank: number;
  nickname: string;
  score: number;
  grade?: RankGrade | null;
  playTime?: number | null;
}

export interface SpeedRankingEntry {
  rank: number;
  nickname: string;
  contribution: number;
}

export interface TimeAttackRankingEntry {
  rank: number;
  nickname: string;
  totalCount: number;
}

export interface CoopRankingEntry {
  rank: number;
  nickname: string;
  clearTime: number; // ms 단위
}

export type RankingEntry =
  | SingleRankingEntry
  | SpeedRankingEntry
  | TimeAttackRankingEntry
  | CoopRankingEntry;

// ── 내 랭킹 타입 ──────────────────────────────────────────

export interface SingleMyRank {
  rank: number;
  score: number;
  grade?: RankGrade | null;
  playTime?: number | null;
}

export interface SpeedMyRank {
  rank: number;
  contribution: number;
}

export interface TimeAttackMyRank {
  rank: number;
  totalCount: number;
}

export interface CoopMyRank {
  rank: number;
  clearTime: number;
}

export type MyRank = SingleMyRank | SpeedMyRank | TimeAttackMyRank | CoopMyRank | null;

// ── 초기 진입 응답 (top3 + myRank + around) ───────────────

export interface RankingInitialResponse<T extends RankingEntry, M extends Exclude<MyRank, null>> {
  year: number;
  month: number;
  week: number;
  top3: T[];
  myRank: M | null;
  around: T[];
  prevCursor?: number | null;
  hasPrev?: boolean;
  nextCursor: number | null;
  hasNext: boolean;
}

// ── 무한 스크롤 응답 (rankings) ───────────────────────────

export interface RankingInfiniteResponse<T extends RankingEntry> {
  rankings: T[];
  prevCursor?: number | null;
  hasPrev?: boolean;
  nextCursor: number | null;
  hasNext: boolean;
}

export type RankingResponse<T extends RankingEntry, M extends Exclude<MyRank, null>> =
  | RankingInitialResponse<T, M>
  | RankingInfiniteResponse<T>;

// ── 등급 뱃지 ─────────────────────────────────────────────

export type RankGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface CoopRankingQuery {
  mapName: string;
  difficulty: string;
  mapId?: number;
}
