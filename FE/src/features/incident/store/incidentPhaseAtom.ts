import { atom } from 'jotai';

import type { Phase } from '../types/incident.types';

export const incidentPhaseAtom = atom<Phase>('idle');
