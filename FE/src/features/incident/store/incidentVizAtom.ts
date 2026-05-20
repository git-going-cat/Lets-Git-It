import { atom } from 'jotai';

import type { FlyingState, VizState } from '../types/incident.types';

export const incidentVizAtom = atom<VizState>({
  working: [],
  staging: [],
  commits: [],
});

export const incidentFlyingAtom = atom<FlyingState | null>(null);
