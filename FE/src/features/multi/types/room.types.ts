export type GameMode = 'CONTRIBUTION' | 'COOP';
export type RoomStatus = 'WAITING' | 'IN_GAME';
export type RoomState = 'WAITING' | 'COUNTDOWN' | 'IN_GAME' | 'RESULT';

export interface RoomSummary {
  roomId: number;
  title: string;
  mode: GameMode;
  currentPlayers: number;
  maxPlayers: number;
  hasPassword: boolean;
  roomState: RoomStatus;
}

export interface RoomListResponse {
  rooms: RoomSummary[];
}

export interface CoopMap {
  mapId: string;
  mapName: string;
  difficulty: number;
  isActive: boolean;
  updatedAt: string;
}

export interface CoopMapListResponse {
  maps: CoopMap[];
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
  selectedMapId: string;
}

export interface CreateCoopRoomResponse {
  roomId: number;
  roomCode: string;
  title: string;
  hasPassword: boolean;
  teamName: string;
  maxPlayers: number;
  selectedMap: {
    mapId: string;
    mapName: string;
    difficulty: number;
  };
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
  mapId: string;
  mapName: string;
  difficulty: number;
}

export interface SelectedMap {
  mapId: string;
  mapName: string;
  difficulty: number;
}

export interface JoinContributionRoomResponse {
  roomId: number;
  roomCode: string;
  title: string;
  mode: 'CONTRIBUTION';
  roomState: RoomState;
  currentPlayers: number;
  maxPlayers: number;
  members: RoomMember[];
}

export interface JoinCoopRoomResponse {
  roomId: number;
  roomCode: string;
  title: string;
  teamName: string;
  mode: 'COOP';
  roomState: RoomState;
  currentPlayers: number;
  maxPlayers: number;
  selectedMap: SelectedMap;
  members: RoomMember[];
  mapList: MapInfo[];
}
