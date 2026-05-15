import { atom } from 'jotai';

import type { CoopPlayer } from '../types/coop.types';

export const coopPlayersAtom = atom<CoopPlayer[]>([]);
