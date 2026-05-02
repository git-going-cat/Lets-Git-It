import { atom } from 'jotai';

export const MAX_LIVES = 3;
export const livesAtom = atom<number>(MAX_LIVES);
