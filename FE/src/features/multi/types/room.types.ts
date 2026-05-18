export type GameMode = 'CONTRIBUTION' | 'COOP';
export type RoomState = 'WAITING' | 'IN_GAME';

export interface RoomSummary {
  roomId: number;
  title: string;
  mode: GameMode;
  currentPlayers: number;
  maxPlayers: number;
  hasPassword: boolean;
  roomState: RoomState;
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

export interface UpdateContributionRoomRequest {
  title: string;
  hasPassword: boolean;
  password?: string | null;
  maxPlayers: number;
}

export interface UpdateCoopRoomRequest {
  title: string;
  teamName: string;
  hasPassword: boolean;
  password?: string | null;
  selectedMapId: string;
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
  hasPassword: boolean;
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
  hasPassword: boolean;
  selectedMap: SelectedMap;
  members: RoomMember[];
  mapList?: MapInfo[];
}

/** ROOM_STATE snapshot: WebSocket private queue or REST GET /api/v1/rooms/{roomId}/state */
export interface ContributionRoomStateResponse {
  type: 'CONTRIBUTION_ROOM_STATE';
  roomId: number;
  roomCode: string;
  title: string;
  mode: 'CONTRIBUTION';
  roomState: RoomState;
  currentPlayers: number;
  maxPlayers: number;
  hasPassword: boolean;
  members: RoomMember[];
}

/** ROOM_STATE snapshot: WebSocket private queue or REST GET /api/v1/rooms/{roomId}/state */
export interface CoopRoomStateResponse {
  type: 'COOP_ROOM_STATE';
  roomId: number;
  roomCode: string;
  title: string;
  teamName: string;
  mode: 'COOP';
  roomState: RoomState;
  currentPlayers: number;
  maxPlayers: number;
  hasPassword: boolean;
  selectedMap: SelectedMap;
  members: RoomMember[];
}

export type RoomStateResponse = ContributionRoomStateResponse | CoopRoomStateResponse;
