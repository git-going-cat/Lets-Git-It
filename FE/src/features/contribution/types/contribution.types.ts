import type { ContributionGameEndSchema, ScoreUpdateSchema } from '../schemas/contribution.schema';
import type { z } from 'zod';

/** 기여도 뺏기 명령어. BE에서 type 분류 없이 text/branchName만 내려오므로 독립 정의. */
export interface ContributionCommand {
  commandSequence: number;
  text: string;
  branchName: string;
  fallDurationMs: number;
}

/** 실시간 랭킹 엔트리. SCORE_UPDATE / COMMAND_EXPIRED / GAME_END 모두 이 형태로 렌더. */
export interface RankingEntry {
  playerId: string | null;
  nickname: string;
  contribution: number;
  rank: number;
  isMe?: boolean;
  disconnected?: boolean;
}

/** 대기방 멤버 중 인게임 위치 정보를 붙인 플레이어. POSITION_UPDATE로 branch가 갱신됨. */
export interface ContributionPlayer {
  playerId: string;
  nickname: string;
  currentBranch: string;
  characterHair: string;
  characterHairColor: string;
  characterBody: string;
  characterEye: string;
  characterOutfit: string;
  characterOutfitColor: string;
  disconnected?: boolean;
}

export interface ContributionProgress {
  current: number;
  total: number;
  percent: number;
}

/** SCORE_UPDATE 패킷 inferred 타입. */
export type ScoreUpdateMessage = z.infer<typeof ScoreUpdateSchema>;

/** CONTRIBUTION_GAME_END 패킷 inferred 타입. */
export type ContributionGameEndMessage = z.infer<typeof ContributionGameEndSchema>;
