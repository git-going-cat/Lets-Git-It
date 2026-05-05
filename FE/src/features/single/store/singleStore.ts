import { create } from 'zustand';

import type { Command, Difficulty } from '../types/single.types';

interface SingleSessionState {
  sessionId: string | null;
  difficulty: Difficulty | null;
  bestScore: number;
  commandSet: Command[];
}

interface SingleSessionActions {
  setSession: (session: SingleSessionState) => void;
  clearSession: () => void;
}

const initialState: SingleSessionState = {
  sessionId: null,
  difficulty: null,
  bestScore: 0,
  commandSet: [],
};

export const useSingleStore = create<SingleSessionState & SingleSessionActions>((set) => ({
  ...initialState,
  setSession: (session) => set(session),
  clearSession: () => set(initialState),
}));
