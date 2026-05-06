import { atom } from 'jotai';

import type { Grade } from '@/shared/types/game.types';

export interface GameResult {
  status: 'SUCCESS' | 'GAMEOVER';
  score: number;
  grade: Grade;
  playTimeMs: number;
  missCount: number;
  typoCount: number;
}

/** game:over EventBus 이벤트 수신 시 저장, ResultModal이 구독 */
export const gameResultAtom = atom<GameResult | null>(null);
