import { create } from 'zustand';

import type { CoopPlayer } from '../types/coop.types';

interface CoopMetaState {
  sessionId: string | null;
  roomId: number | null;
  mapName: string | null;
  playerSnapshots: CoopPlayer[];
  revealDurationMs: number;
}

interface CoopMetaActions {
  setRoomId: (roomId: number) => void;
  setSessionMeta: (meta: Partial<CoopMetaState>) => void;
  setPlayerSnapshots: (players: CoopPlayer[]) => void;
  reset: () => void;
  clearSession: () => void;
}

const initialState: CoopMetaState = {
  sessionId: null,
  roomId: null,
  mapName: null,
  playerSnapshots: [],
  revealDurationMs: 3000,
};

export const useCoopStore = create<CoopMetaState & CoopMetaActions>((set) => ({
  ...initialState,
  setRoomId: (roomId) => set({ roomId }),
  setSessionMeta: (meta) => set((state) => ({ ...state, ...meta })),
  setPlayerSnapshots: (players) => set({ playerSnapshots: players }),
  reset: () => set(initialState),
  clearSession: () => set(initialState),
}));
