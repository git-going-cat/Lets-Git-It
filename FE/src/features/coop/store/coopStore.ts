import { create } from 'zustand';

interface CoopSessionState {
  roomId: number | null;
}

interface CoopSessionActions {
  setRoomId: (roomId: number) => void;
  clearSession: () => void;
}

const initialState: CoopSessionState = {
  roomId: null,
};

export const useCoopStore = create<CoopSessionState & CoopSessionActions>((set) => ({
  ...initialState,

  setRoomId: (roomId) => set({ roomId }),

  clearSession: () => set(initialState),
}));
