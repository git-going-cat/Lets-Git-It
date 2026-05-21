import { create } from 'zustand';

import type { StartSessionData } from '../schemas/single.schema';
import type { ItemType, PlayLogEntry, SingleCommand } from '../types/single.types';
import type { Difficulty } from '@/shared/types/game.types';
import type { TutorialStep } from '@/shared/types/tutorial.types';

const SINGLE_SESSION_TTL_MS = 30 * 60 * 1000;

interface SingleSessionState {
  sessionId: string | null;
  sessionStartedAt: number | null;
  sessionExpiresAt: number | null;
  difficulty: Difficulty | null;
  bestScore: number;
  commandSet: SingleCommand[];
  isTutorial: boolean;
  tutorialSteps: TutorialStep[];
  // playLog는 현재 BE API에서 미지원 — 악성 유저 대응을 위해 FE에서 구조만 선행 구현
  playLog: PlayLogEntry[];
  // 세션 시작/다시하기 API 실패 시 에러 다이얼로그 표시 여부.
  // SinglePage 초기 진입, PauseModal·ResultModal 다시하기 경로에서 set한다.
  startSessionError: boolean;
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
  setStartSessionError: (value: boolean) => void;
}

const ITEM_DROP_RATE: Record<Difficulty, number> = { EASY: 0.4, NORMAL: 0.3, HARD: 0.2 };
const ITEM_TYPES: ItemType[] = ['stash', 'cherry-pick', 'restore'];

function assignItemDrops(commands: SingleCommand[], difficulty: Difficulty): SingleCommand[] {
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
  startSessionError: false,
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
  setStartSessionError: (value) => set({ startSessionError: value }),
}));
