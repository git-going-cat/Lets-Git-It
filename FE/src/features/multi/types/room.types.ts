export type GameMode = 'CONTRIBUTION_RUN' | 'TIME_ATTACK' | 'COOP';
export type RoomStatus = 'WAITING' | 'IN_GAME';
export type RoomState = 'WAITING' | 'COUNTDOWN' | 'IN_GAME' | 'RESULT';

export interface RoomSummary {
  roomId: number;
  title: string;
  mode: GameMode;
  currentPlayers: number;
  maxPlayers: number;
  hasPassword: boolean;
  status: RoomStatus;
}

export interface RoomListResponse {
  rooms: RoomSummary[];
}

export interface CreateContributionRoomRequest {
  title: string;
  maxPlayers?: number;
  hasPassword: boolean;
  password?: string;
}

export interface CreateContributionRoomResponse {
  roomId: number;
  roomCode: string;
  title: string;
  maxPlayers: number;
  hasPassword: boolean;
}

export interface CreateCoopRoomRequest {
  title: string;
  teamName: string;
  hasPassword: boolean;
  password?: string;
}

export interface CreateCoopRoomResponse {
  roomId: number;
  roomCode: string;
  title: string;
  hasPassword: boolean;
  teamName: string;
  maxPlayers: number;
}

export interface RoomMember {
  playerId: string;
  nickname: string;
  characterHair: string;
  characterHairColor: string;
  characterBody: string;
  characterEye: string;
  characterOutfit: string;
  characterOutfitColor: string;
  isReady: boolean;
  isHost: boolean;
  isMe: boolean;
}

export interface MapInfo {
  mapName: string;
  difficulty: string;
}

export interface JoinRoomResponse {
  roomId: number;
  roomCode: string;
  title: string;
  mode: GameMode;
  roomState: RoomState;
  currentPlayers: number;
  maxPlayers: number;
  members: RoomMember[];
  mapList: MapInfo[];
}

export interface VerifyPasswordResponse {
  verified: boolean;
}
