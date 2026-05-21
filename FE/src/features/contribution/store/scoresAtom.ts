import { atom } from 'jotai';

import type { RankingEntry } from '../types/contribution.types';

/** SCORE_UPDATE / COMMAND_EXPIRED 수신마다 갱신되는 실시간 랭킹. */
export const scoresAtom = atom<RankingEntry[]>([]);
