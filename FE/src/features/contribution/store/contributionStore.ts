import { create } from 'zustand';

import type { ContributionCommand, ContributionPlayer } from '../types/contribution.types';

interface ContributionSessionState {
  /** WS 게임 세션 식별자. 게임 시작 시 서버로부터 수신. */
  sessionId: string | null;
  /** REST/WS 방 식별자. WS 구독 경로 조합에 사용. */
  roomId: number | null;
  /** 로컬 플레이어의 UUID. */
  myPlayerId: string | null;
  /** 게임 전체 명령어 목록. 인원수+1개 브랜치에 분산 배치됨. */
  commandSet: ContributionCommand[];
  /** 처음부터 노출되는 브랜치 목록. 순서가 레인 순서가 된다. */
  branches: string[];
  /** 현재 방 참가 플레이어 목록. POSITION_UPDATE로 currentBranch가 갱신됨. */
  players: ContributionPlayer[];
}

interface ContributionSessionActions {
  setSession: (data: {
    sessionId: string;
    roomId: number;
    myPlayerId: string;
    commandSet: ContributionCommand[];
    branches: string[];
    players: ContributionPlayer[];
  }) => void;
  updatePlayerBranch: (playerId: string, branch: string) => void;
  clearSession: () => void;
}

const initialState: ContributionSessionState = {
  sessionId: null,
  roomId: null,
  myPlayerId: null,
  commandSet: [],
  branches: [],
  players: [],
};

export const useContributionStore = create<ContributionSessionState & ContributionSessionActions>(
  (set) => ({
    ...initialState,

    setSession: (data) => set({ ...data }),

    updatePlayerBranch: (playerId, branch) =>
      set((s) => ({
        players: s.players.map((p) =>
          p.playerId === playerId ? { ...p, currentBranch: branch } : p
        ),
      })),

    clearSession: () => set(initialState),
  })
);
