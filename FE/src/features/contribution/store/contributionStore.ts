import { create } from 'zustand';

import type { ContributionCommand, ContributionPlayer } from '../types/contribution.types';

interface ContributionSessionState {
  /** WS 게임 세션 식별자. 게임 시작 시 서버로부터 수신. */
  sessionId: string | null;
  /** REST/WS 방 식별자. WS 구독 경로 조합에 사용. */
  roomId: number | null;
  /** 로컬 플레이어의 UUID. */
  myPlayerId: string | null;
  /** 서버가 CONTRIBUTION_STARTED를 브로드캐스트한 시각 (서버 Unix ms). */
  serverTime: number | null;
  /** 게임 실제 시작 시각 (서버 Unix ms). startAt - serverTime ≈ 3000ms. */
  startAt: number | null;
  /**
   * WS 메시지 수신 시점 기준 클라이언트 wall-clock 게임 시작 예정 시각.
   * = Date.now()_at_receipt + (startAt - serverTime)
   * scheduleFirstSpawn / 카운트다운에서 단순히 (clientStartAt - Date.now())로 지연 계산.
   */
  clientStartAt: number | null;
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
    serverTime: number;
    startAt: number;
    clientStartAt: number;
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
  serverTime: null,
  startAt: null,
  clientStartAt: null,
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
