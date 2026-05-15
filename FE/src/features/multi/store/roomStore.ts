import { create } from 'zustand';

import type {
  ContributionRoomStateResponse,
  CoopRoomStateResponse,
  CreateContributionRoomResponse,
  CreateCoopRoomResponse,
  GameMode,
  JoinContributionRoomResponse,
  JoinCoopRoomResponse,
  MapInfo,
  RoomMember,
  RoomState,
  SelectedMap,
} from '../types/room.types';

// ────────────────────────────────────────────────────────────
// State shape
// ────────────────────────────────────────────────────────────

interface RoomStateSlice {
  roomId: number | null;
  roomCode: string | null;
  title: string | null;
  mode: GameMode | null;
  roomState: RoomState | null;
  currentPlayers: number;
  maxPlayers: number;
  members: RoomMember[];
  /** 협력 모드 전용 */
  teamName: string | null;
  selectedMap: SelectedMap | null;
  mapList: MapInfo[];
}

interface RoomActions {
  /** 기여도 뺏기 create API 응답으로 초기화 (방장) */
  initFromContributionCreate: (data: CreateContributionRoomResponse) => void;
  /** 협력 create API 응답으로 초기화 (방장) */
  initFromCoopCreate: (data: CreateCoopRoomResponse) => void;
  /** 기여도 뺏기 join API 응답으로 초기화 */
  initFromContributionJoin: (data: JoinContributionRoomResponse) => void;
  /** 협력 join API 응답으로 초기화 */
  initFromCoopJoin: (data: JoinCoopRoomResponse) => void;
  /** 재연결 시 기여도 뺏기 방 상태로 전체 복원 */
  initFromContributionRoomState: (data: ContributionRoomStateResponse) => void;
  /** 재연결 시 협력 방 상태로 전체 복원 */
  initFromCoopRoomState: (data: CoopRoomStateResponse) => void;
  /** WebSocket ROOM_STATE / PLAYER_JOINED / READY_CHANGED 공통 멤버 갱신 */
  setMembers: (members: RoomMember[]) => void;
  /** WebSocket ROOM_STATE 방 상태 갱신 */
  setRoomState: (state: RoomState) => void;
  /** 409 재접속 시 최소 정보만 세팅 — REST fallback 방지 */
  setPreviewForReconnect: (data: { roomId: number; title: string; mode: GameMode }) => void;
  /** 방 퇴장 / 언마운트 시 초기화 */
  reset: () => void;
}

// ────────────────────────────────────────────────────────────
// Initial state
// ────────────────────────────────────────────────────────────

const initialState: RoomStateSlice = {
  roomId: null,
  roomCode: null,
  title: null,
  mode: null,
  roomState: null,
  currentPlayers: 0,
  maxPlayers: 0,
  members: [],
  teamName: null,
  selectedMap: null,
  mapList: [],
};

// ────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────

export const useRoomStore = create<RoomStateSlice & RoomActions>((set) => ({
  ...initialState,

  initFromContributionCreate: (data) =>
    set({
      roomId: data.roomId,
      roomCode: data.roomCode,
      title: data.title,
      mode: 'CONTRIBUTION',
      roomState: null,
      currentPlayers: 1,
      maxPlayers: data.maxPlayers,
      members: [],
      teamName: null,
      selectedMap: null,
      mapList: [],
    }),

  initFromCoopCreate: (data) =>
    set({
      roomId: data.roomId,
      roomCode: data.roomCode,
      title: data.title,
      mode: 'COOP',
      roomState: null,
      currentPlayers: 1,
      maxPlayers: data.maxPlayers,
      members: [],
      teamName: data.teamName,
      selectedMap: data.selectedMap,
      mapList: [],
    }),

  initFromContributionJoin: (data) =>
    set({
      roomId: data.roomId,
      roomCode: data.roomCode,
      title: data.title,
      mode: data.mode,
      roomState: data.roomState,
      currentPlayers: data.currentPlayers,
      maxPlayers: data.maxPlayers,
      members: data.members,
      teamName: null,
      selectedMap: null,
      mapList: [],
    }),

  initFromCoopJoin: (data) =>
    set({
      roomId: data.roomId,
      roomCode: data.roomCode,
      title: data.title,
      mode: data.mode,
      roomState: data.roomState,
      currentPlayers: data.currentPlayers,
      maxPlayers: data.maxPlayers,
      members: data.members,
      teamName: data.teamName,
      selectedMap: data.selectedMap,
      mapList: data.mapList,
    }),

  initFromContributionRoomState: (data) =>
    set({
      roomId: data.roomId,
      roomCode: data.roomCode,
      title: data.title,
      mode: 'CONTRIBUTION',
      roomState: data.roomState,
      currentPlayers: data.currentPlayers,
      maxPlayers: data.maxPlayers,
      members: data.members,
      teamName: null,
      selectedMap: null,
      mapList: [],
    }),

  initFromCoopRoomState: (data) =>
    set({
      roomId: data.roomId,
      roomCode: data.roomCode,
      title: data.title,
      mode: 'COOP',
      roomState: data.roomState,
      currentPlayers: data.currentPlayers,
      maxPlayers: data.maxPlayers,
      members: data.members,
      teamName: data.teamName,
      selectedMap: data.selectedMap,
      mapList: [],
    }),

  setMembers: (members) =>
    set((s) => ({ members, currentPlayers: members.length || s.currentPlayers })),

  setRoomState: (roomState) => set({ roomState }),

  setPreviewForReconnect: ({ roomId, title, mode }) =>
    set({ ...initialState, roomId, title, mode }),

  reset: () => set(initialState),
}));
