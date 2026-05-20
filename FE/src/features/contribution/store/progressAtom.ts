import { atom } from 'jotai';

import type { ContributionProgress } from '../types/contribution.types';

/** SCORE_UPDATE의 progress 필드로 갱신되는 전체 게임 진행도. */
export const progressAtom = atom<ContributionProgress>({ current: 0, total: 0, percent: 0 });
