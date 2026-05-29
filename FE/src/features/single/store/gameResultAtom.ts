import { atom } from 'jotai';

import type { Grade } from '@/shared/types/game.types';

export type GameEndReason = 'SUCCESS' | 'GAMEOVER' | 'ESCAPE_FAILED' | 'SESSION_EXPIRED';

export interface GameResult {
  status: GameEndReason;
  score: number;
  grade: Grade;
  playTimeMs: number;
  missCount: number;
  typoCount: number;
}

/** game:over singleBus 이벤트 수신 시 저장, ResultModal이 구독 */
export const gameResultAtom = atom<GameResult | null>(null);
