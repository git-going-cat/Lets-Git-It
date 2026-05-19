export interface WeekParam {
  year: number;
  month: number;
  week: number;
}

export const SINGLE_RANKING_MODES = ['single-easy', 'single-normal', 'single-hard'] as const;

export type SingleRankingMode = (typeof SINGLE_RANKING_MODES)[number];

export type RankingMode = SingleRankingMode | 'speed' | 'timeattack' | 'coop';

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
  clearTime: number;
  difficulty: number;
  nickname?: string;
  teamName?: string;
  members?: string[];
  wrongTypeCount?: number;
  wrongOrderCount?: number;
  mapId?: string | number;
  mapName?: string;
}

export type RankingEntry =
  | SingleRankingEntry
  | SpeedRankingEntry
  | TimeAttackRankingEntry
  | CoopRankingEntry;

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

export type RankGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface CoopRankingQuery {
  mapName: string;
  difficulty: number;
  mapId?: string | number;
}
