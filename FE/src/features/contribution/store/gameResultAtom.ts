import { atom } from 'jotai';

import type { ContributionGameEndMessage } from '../types/contribution.types';

export const gameResultAtom = atom<ContributionGameEndMessage | null>(null);
