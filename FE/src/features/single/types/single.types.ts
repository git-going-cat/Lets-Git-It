export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover' | 'cleared';

export const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type { StartSessionData } from '../schemas/single.schema';

export interface PlayLogEntry {
  seq: number;
  event: 'complete' | 'miss' | 'typo';
}

export interface SaveResultRequest {
  status: 'SUCCESS' | 'GAMEOVER';
  score: number;
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

export type CommandType = 'CREATE' | 'MERGE' | 'COMMON' | 'SWITCH';

export interface Command {
  commandSequence: number;
  text: string;
  branchName: string;
  type: CommandType;
  /** 세션 시작 시 사전 배정된 아이템 드롭. undefined면 일반 노드. */
  itemDrop?: ItemType;
}

export interface SingleSceneData {
  sessionId: string;
  difficulty: Difficulty;
  commandSet: Command[];
  isTutorial?: boolean;
}
