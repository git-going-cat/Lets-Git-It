import { atom } from 'jotai';

import type { CoopCommandCard } from '../types/coop.types';

export const coopCommandsAtom = atom<CoopCommandCard[]>([]);
export const coopMyCommandAtom = atom<string | null>(null);
export const coopMyCommandOrderAtom = atom<number | null>(null);
export const coopMyCommandCompletedAtom = atom(false);
export const coopPendingInputRequestIdsAtom = atom<Set<string>>(new Set<string>());
