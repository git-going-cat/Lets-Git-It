import { http } from '@/core/http';

import {
  createContributionRoomResponseSchema,
  createCoopRoomResponseSchema,
  joinRoomResponseSchema,
  roomListResponseSchema,
  roomSummarySchema,
  verifyPasswordResponseSchema,
} from '../schemas/room.schema';

import type {
  CreateContributionRoomRequest,
  CreateContributionRoomResponse,
  CreateCoopRoomRequest,
  CreateCoopRoomResponse,
  JoinRoomResponse,
  RoomListResponse,
  RoomSummary,
  VerifyPasswordResponse,
} from '../types/room.types';

export async function getRooms(mode: string): Promise<RoomListResponse> {
  const { data } = await http.get<{ data: unknown }>('/api/v1/rooms', {
    params: { mode },
  });
  return roomListResponseSchema.parse(data.data);
}

export async function getRoomByCode(code: string): Promise<RoomSummary> {
  const { data } = await http.get<{ data: unknown }>('/api/v1/rooms', {
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

export async function createCoopRoom(body: CreateCoopRoomRequest): Promise<CreateCoopRoomResponse> {
  const { data } = await http.post<{ data: unknown }>('/api/v1/rooms/coop', body);
  return createCoopRoomResponseSchema.parse(data.data);
}

export async function verifyRoomPassword(
  roomId: number,
  password: string
): Promise<VerifyPasswordResponse> {
  const { data } = await http.post<{ data: unknown }>(`/api/v1/rooms/${roomId}/password/verify`, {
    password,
  });
  return verifyPasswordResponseSchema.parse(data.data);
}

export async function joinRoom(roomId: number): Promise<JoinRoomResponse> {
  const { data } = await http.post<{ data: unknown }>(`/api/v1/rooms/${roomId}/join`);
  return joinRoomResponseSchema.parse(data.data);
}
