import { atom } from 'jotai';

import type { CoopGamePhase } from '../types/coop.types';

export const coopPhaseAtom = atom<CoopGamePhase>('waiting');
export const coopRoundAtom = atom(1);
export const coopCompletedCountAtom = atom(0);
export const coopCurrentOrderAtom = atom(1);
export const coopInputBlockedAtom = atom(false);
export const coopResetTargetPlayerIdAtom = atom<string | null>(null);
export const coopGraphImageUrlAtom = atom<string | null>(null);
export const coopGraphCompletedSequencesAtom = atom<number[]>([]);
export const coopGraphActiveSequenceAtom = atom<number | null>(null);
export const coopWrongPlayerNicknameAtom = atom<string | null>(null);
