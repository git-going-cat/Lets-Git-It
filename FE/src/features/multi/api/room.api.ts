import { http } from '@/core/http';

import {
  coopMapListResponseSchema,
  createContributionRoomResponseSchema,
  createCoopRoomResponseSchema,
  joinContributionRoomResponseSchema,
  joinCoopRoomResponseSchema,
  roomListResponseSchema,
  roomStateResponseSchema,
  roomSummarySchema,
  verifyPasswordResponseSchema,
} from '../schemas/room.schema';

import type {
  CoopMapListResponse,
  CreateContributionRoomRequest,
  CreateContributionRoomResponse,
  CreateCoopRoomRequest,
  CreateCoopRoomResponse,
  JoinContributionRoomResponse,
  JoinCoopRoomResponse,
  RoomListResponse,
  RoomStateResponse,
  RoomSummary,
  UpdateContributionRoomRequest,
  UpdateCoopRoomRequest,
} from '../types/room.types';

export async function getRooms(mode: string): Promise<RoomListResponse> {
  const { data } = await http.get<{ data: unknown }>('/api/v1/rooms', {
    params: { mode },
  });
  return roomListResponseSchema.parse(data.data);
}

export async function getRoomByCode(code: string): Promise<RoomSummary> {
  const { data } = await http.get<{ data: unknown }>('/api/v1/rooms/search', {
    params: { code },
  });
  return roomSummarySchema.parse(data.data);
}

export async function createContributionRoom(
  body: CreateContributionRoomRequest
): Promise<CreateContributionRoomResponse> {
  const { data } = await http.post<{ data: unknown }>('/api/v1/rooms/contribution', body);
  return createContributionRoomResponseSchema.parse(data.data);
}

export async function getCoopMaps(): Promise<CoopMapListResponse> {
  const { data } = await http.get<{ data: unknown }>('/api/v1/rooms/coop/maps');
  return coopMapListResponseSchema.parse(data.data);
}

export async function createCoopRoom(body: CreateCoopRoomRequest): Promise<CreateCoopRoomResponse> {
  const { data } = await http.post<{ data: unknown }>('/api/v1/rooms/coop', body);
  return createCoopRoomResponseSchema.parse(data.data);
}

export async function updateContributionRoom(
  roomId: number,
  body: UpdateContributionRoomRequest
): Promise<void> {
  await http.patch(`/api/v1/rooms/${roomId}/contribution`, body);
}

export async function updateCoopRoom(roomId: number, body: UpdateCoopRoomRequest): Promise<void> {
  await http.patch(`/api/v1/rooms/${roomId}/coop`, body);
}

export async function kickRoomMember(roomId: number, playerId: string): Promise<void> {
  await http.delete(`/api/v1/rooms/${roomId}/members/${playerId}`);
}

export async function verifyRoomPassword(roomId: number, password: string): Promise<void> {
  const { data } = await http.post<{ data: unknown }>(`/api/v1/rooms/${roomId}/password/verify`, {
    password,
  });
  verifyPasswordResponseSchema.parse(data.data);
}

export async function joinContributionRoom(roomId: number): Promise<JoinContributionRoomResponse> {
  const { data } = await http.post<{ data: unknown }>(`/api/v1/rooms/${roomId}/contribution/join`);
  return joinContributionRoomResponseSchema.parse(data.data);
}

export async function joinCoopRoom(roomId: number): Promise<JoinCoopRoomResponse> {
  const { data } = await http.post<{ data: unknown }>(`/api/v1/rooms/${roomId}/coop/join`);
  return joinCoopRoomResponseSchema.parse(data.data);
}

export async function leaveRoom(roomId: number): Promise<void> {
  await http.delete(`/api/v1/rooms/${roomId}/leave`);
}

/** 재연결 REST fallback: GET /api/v1/rooms/{roomId}/state */
export async function getRoomState(roomId: number): Promise<RoomStateResponse> {
  const { data } = await http.get<{ data: unknown }>(`/api/v1/rooms/${roomId}/state`);
  return roomStateResponseSchema.parse(data.data);
}
