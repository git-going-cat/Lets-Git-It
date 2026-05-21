import { atom } from 'jotai';

import type { HistoryEntry, ScoreResult } from '../types/incident.types';

export const incidentScoredAtom = atom<ScoreResult | null>(null);
export const incidentBestScoreAtom = atom<number>(0);
export const incidentHistoryAtom = atom<HistoryEntry[]>([]);
