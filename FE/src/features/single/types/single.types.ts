export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover' | 'cleared';

// TODO: singleApi.ts에 Zod 스키마 추가 후 z.infer<>로 교체
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

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
  displayText: string;
  branchName: string;
  type: CommandType;
}

export interface SingleSceneData {
  sessionId: string;
  difficulty: Difficulty;
  commandSet: Command[];
  isTutorial?: boolean;
}
