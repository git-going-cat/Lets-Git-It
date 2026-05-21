import { atom } from 'jotai';

import type { TutorialHighlightTarget } from '../constants/tutorialData';

export const tutorialHighlightAtom = atom<TutorialHighlightTarget[]>([]);
