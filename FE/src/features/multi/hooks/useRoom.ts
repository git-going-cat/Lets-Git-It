import { useMutation, useQuery } from '@tanstack/react-query';

import { createRoom, getRoomByCode, getRooms, joinRoom, verifyRoomPassword } from '../api/room.api';

import type { CreateRoomRequest } from '../types/room.types';

/**
 * 모드별 방 목록을 5초마다 폴링하여 조회한다.
 * @param mode - 필터링할 게임 모드 (`CONTRIBUTION_RUN` | `TIME_ATTACK` | `COOP`)
 */
export function useRooms(mode: string) {
  return useQuery({
    queryKey: ['rooms', mode],
    queryFn: () => getRooms(mode),
    refetchInterval: 5000,
  });
}

/**
 * 방 코드(6자리)로 단일 방 정보를 검색한다.
 */
export function useRoomByCode() {
  return useMutation({
    mutationFn: (code: string) => getRoomByCode(code),
  });
}

/**
 * 새 방을 생성한다. 응답으로 roomId와 roomCode를 반환한다.
 */
export function useCreateRoom() {
  return useMutation({
    mutationFn: (body: CreateRoomRequest) => createRoom(body),
  });
}

/**
 * 비밀방의 비밀번호를 서버에서 검증한다.
 * 검증 성공 시 `verified: true`를 반환한다.
 */
export function useVerifyRoomPassword() {
  return useMutation({
    mutationFn: ({ roomId, password }: { roomId: number; password: string }) =>
      verifyRoomPassword(roomId, password),
  });
}

/**
 * roomId로 방에 입장한다. 성공 시 방 상태 및 멤버 목록을 반환한다.
 */
export function useJoinRoom() {
  return useMutation({
    mutationFn: (roomId: number) => joinRoom(roomId),
  });
}
