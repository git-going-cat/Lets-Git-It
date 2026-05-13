import { useMutation, useQuery } from '@tanstack/react-query';

import {
  createContributionRoom,
  createCoopRoom,
  getRoomByCode,
  getRooms,
  joinContributionRoom,
  joinCoopRoom,
  verifyRoomPassword,
} from '../api/room.api';

import type { CreateContributionRoomRequest, CreateCoopRoomRequest } from '../types/room.types';

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
 * 기여도 뺏기 방을 생성한다. POST /api/v1/rooms/contribution
 */
export function useCreateContributionRoom() {
  return useMutation({
    mutationFn: (body: CreateContributionRoomRequest) => createContributionRoom(body),
  });
}

/**
 * 협력 방을 생성한다. POST /api/v1/rooms/coop
 */
export function useCreateCoopRoom() {
  return useMutation({
    mutationFn: (body: CreateCoopRoomRequest) => createCoopRoom(body),
  });
}

/**
 * 비밀방의 비밀번호를 서버에서 검증한다.
 * HTTP 200 응답 시 성공, 오류 시 서버가 에러 코드를 반환한다.
 */
export function useVerifyRoomPassword() {
  return useMutation({
    mutationFn: ({ roomId, password }: { roomId: number; password: string }) =>
      verifyRoomPassword(roomId, password),
  });
}

/**
 * 기여도 뺏기 방에 입장한다. POST /api/v1/rooms/{roomId}/contribution/join
 */
export function useJoinContributionRoom() {
  return useMutation({
    mutationFn: (roomId: number) => joinContributionRoom(roomId),
  });
}

/**
 * 협력 방에 입장한다. POST /api/v1/rooms/{roomId}/coop/join
 */
export function useJoinCoopRoom() {
  return useMutation({
    mutationFn: (roomId: number) => joinCoopRoom(roomId),
  });
}
