import { atom } from 'jotai';

import type { CoopPlayer } from '../types/coop.types';

export const coopPlayersAtom = atom<CoopPlayer[]>([]);

export interface CoopPlayerStat {
  typoCount: number;
  resetCount: number;
}

export const coopPlayerStatsAtom = atom<Record<string, CoopPlayerStat>>({});
