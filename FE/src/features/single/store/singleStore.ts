import { create } from 'zustand';

import type { StartSessionData } from '../schemas/single.schema';
import type { Command, Difficulty, ItemType, PlayLogEntry } from '../types/single.types';
import type { TutorialStep } from '@/features/auth/schemas/onboarding.schema';

const SINGLE_SESSION_TTL_MS = 30 * 60 * 1000;

interface SingleSessionState {
  sessionId: string | null;
  sessionStartedAt: number | null;
  sessionExpiresAt: number | null;
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

const ITEM_DROP_RATE: Record<Difficulty, number> = { EASY: 0.4, NORMAL: 0.3, HARD: 0.2 };
const ITEM_TYPES: ItemType[] = ['stash', 'cherry-pick', 'restore'];

function assignItemDrops(commands: Command[], difficulty: Difficulty): Command[] {
  const rate = ITEM_DROP_RATE[difficulty];
  return commands.map((cmd) => {
    if (Math.random() < rate) {
      return { ...cmd, itemDrop: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)] };
    }
    return cmd;
  });
}

const initialState: SingleSessionState = {
  sessionId: null,
  sessionStartedAt: null,
  sessionExpiresAt: null,
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
    set((prev) => {
      const now = Date.now();
      return {
        ...session,
        sessionStartedAt: now,
        sessionExpiresAt: now + SINGLE_SESSION_TTL_MS,
        isTutorial: session.isTutorial ?? false,
        tutorialSteps: session.tutorialSteps ?? prev.tutorialSteps,
        commandSet:
          session.isTutorial || !session.difficulty
            ? session.commandSet
            : assignItemDrops(session.commandSet, session.difficulty),
        playLog: [],
      };
    }),
  clearSession: () => set(initialState),
  appendLog: (entry) => set((state) => ({ playLog: [...state.playLog, entry] })),
}));
