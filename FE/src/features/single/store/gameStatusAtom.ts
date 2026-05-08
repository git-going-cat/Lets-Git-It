import { atom } from 'jotai';

import type { GameStatus } from '../types/single.types';

export const gameStatusAtom = atom<GameStatus>('idle');

/** ESC로 pause 진입 시 복귀할 이전 상태를 보존 (idle ↔ playing 구분) */
export const prePauseStatusAtom = atom<'idle' | 'playing'>('playing');
