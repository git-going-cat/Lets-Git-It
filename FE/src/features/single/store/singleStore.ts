import { create } from 'zustand';

import type { StartSessionData } from '../schemas/single.schema';
import type { Command, Difficulty, PlayLogEntry } from '../types/single.types';
import type { TutorialStep } from '@/features/auth/schemas/onboarding.schema';

interface SingleSessionState {
  sessionId: string | null;
  difficulty: Difficulty | null;
  bestScore: number;
  commandSet: Command[];
  isTutorial: boolean;
  tutorialSteps: TutorialStep[];
  // playLog는 현재 BE API에서 미지원 — 악성 유저 대응을 위해 FE에서 구조만 선행 구현
  playLog: PlayLogEntry[];
}

interface SingleSessionActions {
  setSession: (
    session: StartSessionData & {
      isTutorial?: boolean;
      tutorialSteps?: TutorialStep[];
    }
  ) => void;
  clearSession: () => void;
  appendLog: (entry: PlayLogEntry) => void;
}

const initialState: SingleSessionState = {
  sessionId: null,
  difficulty: null,
  bestScore: 0,
  commandSet: [],
  isTutorial: false,
  tutorialSteps: [],
  playLog: [],
};

export const useSingleStore = create<SingleSessionState & SingleSessionActions>((set) => ({
  ...initialState,
  setSession: (session) =>
    set((prev) => ({
      ...session,
      isTutorial: session.isTutorial ?? false,
      tutorialSteps: session.tutorialSteps ?? prev.tutorialSteps,
      playLog: [],
    })),
  clearSession: () => set(initialState),
  appendLog: (entry) => set((state) => ({ playLog: [...state.playLog, entry] })),
}));
