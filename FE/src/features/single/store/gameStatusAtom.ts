import { atom } from 'jotai';

import type { GameStatus } from '../types/single.types';

export const gameStatusAtom = atom<GameStatus>('idle');
