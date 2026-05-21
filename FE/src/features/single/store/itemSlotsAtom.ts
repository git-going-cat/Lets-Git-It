import { atom } from 'jotai';

export const itemSlotsAtom = atom<[boolean, boolean, boolean]>([false, false, false]);
