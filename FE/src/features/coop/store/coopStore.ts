import { create } from 'zustand';

import type { CoopPlayer } from '../types/coop.types';
import type { CoopGameEndMessage } from '@/features/multi/schemas/coop.schema';

interface CoopMetaState {
  sessionId: string | null;
  gameSessionId: string | null;
  roomId: number | null;
  mapName: string | null;
  playerSnapshots: CoopPlayer[];
  startKey: number;
  startDelayMs: number;
  revealKey: number;
  revealDelayMs: number;
  revealDurationMs: number;
  totalRounds: number;
  graphData: unknown | null;
  result: CoopGameEndMessage | null;
  pendingMessages: unknown[];
}

interface CoopMetaActions {
  setRoomId: (roomId: number) => void;
  setGameSessionId: (id: string) => void;
  setTotalRounds: (n: number) => void;
  setGraphData: (data: unknown) => void;
  setResult: (result: CoopGameEndMessage | null) => void;
  setSessionMeta: (meta: Partial<CoopMetaState>) => void;
  setPlayerSnapshots: (players: CoopPlayer[]) => void;
  enqueuePendingMessage: (message: unknown) => void;
  consumePendingMessages: () => unknown[];
  reset: () => void;
  clearSession: () => void;
}

const initialState: CoopMetaState = {
  sessionId: null,
  gameSessionId: null,
  roomId: null,
  mapName: null,
  playerSnapshots: [],
  startKey: 0,
  startDelayMs: 0,
  revealKey: 0,
  revealDelayMs: 0,
  revealDurationMs: 3000,
  totalRounds: 5,
  graphData: null,
  result: null,
  pendingMessages: [],
};

export const useCoopStore = create<CoopMetaState & CoopMetaActions>((set, get) => {
  const resetSession = () => set(initialState);

  return {
    ...initialState,
    setRoomId: (roomId) => set({ roomId }),
    setGameSessionId: (id) => set({ gameSessionId: id, sessionId: id }),
    setTotalRounds: (n) => set({ totalRounds: n }),
    setGraphData: (data) => set({ graphData: data }),
    setResult: (result) => set({ result }),
    setSessionMeta: (meta) => set((state) => ({ ...state, ...meta })),
    setPlayerSnapshots: (players) => set({ playerSnapshots: players }),
    enqueuePendingMessage: (message) =>
      set((state) => ({ pendingMessages: [...state.pendingMessages, message] })),
    consumePendingMessages: () => {
      const messages = get().pendingMessages;
      set({ pendingMessages: [] });
      return messages;
    },
    reset: resetSession,
    clearSession: resetSession,
  };
});
