import { create } from 'zustand';

import type {
  ChatResponseMessage,
  ContributionRoomInfoUpdatedMessage,
  CoopRoomInfoUpdatedMessage,
} from '../types/room.socket.types';
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
  hasPassword: boolean;
  members: RoomMember[];
  allReady: boolean;
  /** 협력 모드 전용 */
  teamName: string | null;
  selectedMap: SelectedMap | null;
  mapList: MapInfo[];
  chatMessages: ChatResponseMessage[];
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
  /** 방 정보 수정 브로드캐스트로 기여도 뺏기 방 정보 갱신 */
  applyContributionRoomInfoUpdated: (data: ContributionRoomInfoUpdatedMessage) => void;
  /** 방 정보 수정 브로드캐스트로 협력 방 정보 갱신 */
  applyCoopRoomInfoUpdated: (data: CoopRoomInfoUpdatedMessage) => void;
  /** WebSocket ROOM_STATE / PLAYER_JOINED / PLAYER_LEFT 공통 멤버 갱신 */
  setMembers: (members: RoomMember[]) => void;
  /** WebSocket READY_CHANGED 단일 플레이어 준비 상태 갱신 */
  updateReady: (data: {
    playerId: string;
    nickname: string;
    isReady: boolean;
    allReady: boolean;
  }) => void;
  /** WebSocket ROOM_STATE 방 상태 갱신 */
  setRoomState: (state: RoomState) => void;
  /** WebSocket CHAT_RESPONSE 채팅 메시지 추가 */
  appendChatMessage: (message: ChatResponseMessage) => void;
  /** 409 재접속 시 최소 정보만 세팅 — 대기실에서 ROOM_STATE로 복원 */
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
  hasPassword: false,
  members: [],
  allReady: false,
  teamName: null,
  selectedMap: null,
  mapList: [],
  chatMessages: [],
};

// ────────────────────────────────────────────────────────────
// Store
// ────────────────────────────────────────────────────────────

const computeAllReady = (members: RoomMember[]) => {
  const nonHostMembers = members.filter((member) => !member.isHost);
  return nonHostMembers.length > 0 && nonHostMembers.every((member) => member.isReady);
};

const normalizeMembers = (members: RoomMember[]) => [...members].reverse();

const computeMembersState = (members: RoomMember[]) => {
  const normalizedMembers = normalizeMembers(members);
  return {
    members: normalizedMembers,
    allReady: computeAllReady(normalizedMembers),
  };
};

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
      hasPassword: data.hasPassword,
      members: [],
      allReady: false,
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
      hasPassword: data.hasPassword,
      members: [],
      allReady: false,
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
      hasPassword: data.hasPassword,
      ...computeMembersState(data.members),
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
      hasPassword: data.hasPassword,
      ...computeMembersState(data.members),
      teamName: data.teamName,
      selectedMap: data.selectedMap,
      mapList: data.mapList ?? [],
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
      hasPassword: data.hasPassword,
      ...computeMembersState(data.members),
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
      hasPassword: data.hasPassword,
      ...computeMembersState(data.members),
      teamName: data.teamName,
      selectedMap: data.selectedMap,
      mapList: [],
    }),

  applyContributionRoomInfoUpdated: (data) =>
    set({
      roomId: data.roomId,
      roomCode: data.roomCode,
      title: data.title,
      mode: 'CONTRIBUTION',
      roomState: data.roomState,
      currentPlayers: data.currentPlayers,
      maxPlayers: data.maxPlayers,
      hasPassword: data.hasPassword,
      ...computeMembersState(data.members),
      teamName: null,
      selectedMap: null,
      mapList: [],
    }),

  applyCoopRoomInfoUpdated: (data) =>
    set({
      roomId: data.roomId,
      roomCode: data.roomCode,
      title: data.title,
      mode: 'COOP',
      roomState: data.roomState,
      currentPlayers: data.currentPlayers,
      maxPlayers: data.maxPlayers,
      hasPassword: data.hasPassword,
      ...computeMembersState(data.members),
      teamName: data.teamName,
      selectedMap: data.selectedMap,
    }),

  setMembers: (members) =>
    set({
      ...computeMembersState(members),
      currentPlayers: members.length,
    }),

  updateReady: ({ playerId, nickname, isReady, allReady }) =>
    set((s) => ({
      members: s.members.map((member) =>
        member.playerId === playerId || member.nickname === nickname
          ? { ...member, isReady }
          : member
      ),
      allReady,
    })),

  setRoomState: (roomState) => set({ roomState }),

  appendChatMessage: (message) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, message],
    })),

  setPreviewForReconnect: ({ roomId, title, mode }) =>
    set({ ...initialState, roomId, title, mode }),

  reset: () => set(initialState),
}));
