import { create } from 'zustand';

import type { CoopPlayer } from '../types/coop.types';
import type { CoopGameEndMessage } from '@/features/multi/schemas/coop.schema';

interface CoopMetaState {
  sessionId: string | null;
  gameSessionId: string | null;
  roomId: number | null;
  mapName: string | null;
  playerSnapshots: CoopPlayer[];
  revealDurationMs: number;
  totalRounds: number;
  graphData: unknown | null;
  result: CoopGameEndMessage | null;
}

interface CoopMetaActions {
  setRoomId: (roomId: number) => void;
  setGameSessionId: (id: string) => void;
  setTotalRounds: (n: number) => void;
  setGraphData: (data: unknown) => void;
  setResult: (result: CoopGameEndMessage | null) => void;
  setSessionMeta: (meta: Partial<CoopMetaState>) => void;
  setPlayerSnapshots: (players: CoopPlayer[]) => void;
  reset: () => void;
  clearSession: () => void;
}

const initialState: CoopMetaState = {
  sessionId: null,
  gameSessionId: null,
  roomId: null,
  mapName: null,
  playerSnapshots: [],
  revealDurationMs: 3000,
  totalRounds: 5,
  graphData: null,
  result: null,
};

export const useCoopStore = create<CoopMetaState & CoopMetaActions>((set) => ({
  ...initialState,
  setRoomId: (roomId) => set({ roomId }),
  setGameSessionId: (id) => set({ gameSessionId: id, sessionId: id }),
  setTotalRounds: (n) => set({ totalRounds: n }),
  setGraphData: (data) => set({ graphData: data }),
  setResult: (result) => set({ result }),
  setSessionMeta: (meta) => set((state) => ({ ...state, ...meta })),
  setPlayerSnapshots: (players) => set({ playerSnapshots: players }),
  reset: () => set(initialState),
  clearSession: () => set(initialState),
}));
