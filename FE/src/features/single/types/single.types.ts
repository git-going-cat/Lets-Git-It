import type { Command, Difficulty } from '@/shared/types/game.types';

export type { StartSessionData } from '../schemas/single.schema';

export interface PlayLogEntry {
  seq: number;
  event: 'complete' | 'miss' | 'typo';
}

export interface SaveResultRequest {
  status: 'SUCCESS' | 'GAMEOVER';
  score: number;
  /**
   * 플레이 시간(ms).
   * BE는 이 값을 초 단위로 변환해 누적 플레이 시간에 반영한다.
   */
  playTime: number;
  grade: string;
  playLog: PlayLogEntry[];
}

export type ItemType = 'restore' | 'stash' | 'cherry-pick';
/** 슬롯 인덱스(0‥2) → 아이템 타입 고정 매핑 */
export const ITEM_SLOT_MAP = ['stash', 'cherry-pick', 'restore'] as const satisfies [
  ItemType,
  ItemType,
  ItemType,
];

/** 싱글 전용 명령어. 세션 시작 시 사전 배정된 아이템 드롭 정보를 포함한다. */
export interface SingleCommand extends Command {
  /** undefined면 일반 노드. */
  itemDrop?: ItemType;
}

export interface SingleSceneData {
  sessionId: string;
  difficulty: Difficulty;
  commandSet: SingleCommand[];
  isTutorial?: boolean;
}
