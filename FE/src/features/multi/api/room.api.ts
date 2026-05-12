import { http } from '@/core/http';

import {
  createRoomResponseSchema,
  joinRoomResponseSchema,
  roomListResponseSchema,
  roomSummarySchema,
  verifyPasswordResponseSchema,
} from '../schemas/room.schema';

import type {
  CreateRoomRequest,
  CreateRoomResponse,
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

export async function createRoom(body: CreateRoomRequest): Promise<CreateRoomResponse> {
  const { data } = await http.post<{ data: unknown }>('/api/v1/rooms', body);
  return createRoomResponseSchema.parse(data.data);
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
