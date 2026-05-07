import { create } from 'zustand';

import { TUTORIAL_STEP_META } from '../constants/tutorialData';

import type { TutorialStepMeta } from '../constants/tutorialData';
import type { Command, Difficulty } from '../types/single.types';

interface SingleSessionState {
  sessionId: string | null;
  difficulty: Difficulty | null;
  bestScore: number;
  commandSet: Command[];
  githubName: string | null;
  isTutorial: boolean;
  /** 튜토리얼 단계 메타 정보. API 응답으로 교체되기 전까지 기본값으로 하드코딩 사용 */
  tutorialStepMeta: TutorialStepMeta[];
}

interface SingleSessionActions {
  setSession: (
    session: Omit<SingleSessionState, 'tutorialStepMeta'> & {
      tutorialStepMeta?: TutorialStepMeta[];
    }
  ) => void;
  clearSession: () => void;
}

const initialState: SingleSessionState = {
  sessionId: null,
  difficulty: null,
  bestScore: 0,
  commandSet: [],
  githubName: null,
  isTutorial: false,
  tutorialStepMeta: TUTORIAL_STEP_META,
};

export const useSingleStore = create<SingleSessionState & SingleSessionActions>((set) => ({
  ...initialState,
  setSession: (session) =>
    set((prev) => ({
      ...session,
      tutorialStepMeta: session.tutorialStepMeta ?? prev.tutorialStepMeta,
    })),
  clearSession: () => set(initialState),
}));
