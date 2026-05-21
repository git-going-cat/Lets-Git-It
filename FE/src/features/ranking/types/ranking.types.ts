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
  playerId: string;
  nickname: string;
  contribution: number;
  playCount: number;
}

export interface TimeAttackRankingEntry {
  rank: number;
  nickname: string;
  totalCount: number;
}

export interface CoopRankingMember {
  playerId: string;
  nickname: string;
}

export interface CoopRankingEntry {
  rank: number;
  teamName: string;
  mapName: string;
  difficulty: number;
  elapsedTime: number;
  totalWrongTypeCount: number;
  totalWrongOrderCount: number;
  members: CoopRankingMember[];
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
  playCount: number;
}

export interface TimeAttackMyRank {
  rank: number;
  totalCount: number;
}

export interface CoopMyRank {
  rank: number;
  teamName: string;
  mapName: string;
  difficulty: number;
  elapsedTime: number;
  totalWrongTypeCount: number;
  totalWrongOrderCount: number;
  members: CoopRankingMember[];
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
  mapId?: string;
}

export interface CoopRankingMap {
  mapId: string;
  mapName: string;
  difficulty: number;
  isActive: boolean;
  updatedAt: string;
}

export interface CoopRankingMapListResponse {
  maps: CoopRankingMap[];
}
