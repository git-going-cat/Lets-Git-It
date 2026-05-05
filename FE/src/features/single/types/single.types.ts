export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover' | 'cleared';

// TODO: singleApi.ts에 Zod 스키마 추가 후 z.infer<>로 교체
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export type CommandType = 'CREATE' | 'MERGE' | 'COMMON';

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
}
