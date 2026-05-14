export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover' | 'cleared';

// CONFLICT: PR B에서는 일반 MERGE처럼 처리. PR C에서 미니게임 트리거로 동작 분기 추가 예정.
export type CommandType = 'CREATE' | 'MERGE' | 'COMMON' | 'SWITCH' | 'CONFLICT';

/** 모든 게임 모드가 공유하는 명령어 단위. 모드별 확장 필드는 각자 타입에서 추가. */
export interface Command {
  commandSequence: number;
  text: string;
  branchName: string;
  type: CommandType;
}
