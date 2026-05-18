import { useMutation, useQuery } from '@tanstack/react-query';

import {
  createContributionRoom,
  createCoopRoom,
  getCoopMaps,
  getRoomByCode,
  getRooms,
  joinContributionRoom,
  joinCoopRoom,
  kickRoomMember,
  updateContributionRoom,
  updateCoopRoom,
  verifyRoomPassword,
} from '../api/room.api';
import { useRoomStore } from '../store/roomStore';

import type {
  CreateContributionRoomRequest,
  CreateCoopRoomRequest,
  UpdateContributionRoomRequest,
  UpdateCoopRoomRequest,
} from '../types/room.types';

/**
 * 모드별 방 목록을 5초마다 폴링하여 조회한다.
 * @param mode - 필터링할 게임 모드 (`CONTRIBUTION` | `COOP`)
 * @param enabled - false 시 폴링을 중단한다. 모달이 열려 있을 때 불필요한 요청을 막기 위해 사용한다.
 */
export function useRooms(mode: string, enabled = true) {
  return useQuery({
    queryKey: ['rooms', mode],
    queryFn: () => getRooms(mode),
    staleTime: 4000,
    refetchInterval: enabled ? 5000 : false,
    enabled,
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
 * 협력 모드 맵 목록을 조회한다. GET /api/v1/rooms/coop/maps
 * staleTime: Infinity 로 최초 1회만 서버 요청하고 이후 캐시를 사용한다.
 */
export function useCoopMaps(enabled = true) {
  return useQuery({
    queryKey: ['coop-maps'],
    queryFn: getCoopMaps,
    staleTime: Infinity,
    enabled,
  });
}

/**
 * 기여도 뺏기 방을 생성한다. POST /api/v1/rooms/contribution
 */
export function useCreateContributionRoom() {
  const initFromContributionCreate = useRoomStore((s) => s.initFromContributionCreate);
  return useMutation({
    mutationFn: (body: CreateContributionRoomRequest) => createContributionRoom(body),
    onSuccess: (data) => initFromContributionCreate(data),
  });
}

/**
 * 협력 방을 생성한다. POST /api/v1/rooms/coop
 */
export function useCreateCoopRoom() {
  const initFromCoopCreate = useRoomStore((s) => s.initFromCoopCreate);
  return useMutation({
    mutationFn: (body: CreateCoopRoomRequest) => createCoopRoom(body),
    onSuccess: (data) => initFromCoopCreate(data),
  });
}

/**
 * 기여도 뺏기 방 정보를 수정한다. PATCH /api/v1/rooms/{roomId}/contribution
 *
 * 성공 후 최신 방 정보는 /topic/room/{roomId} 의 CONTRIBUTION_ROOM_INFO_UPDATED로 반영된다.
 */
export function useUpdateContributionRoom() {
  return useMutation({
    mutationFn: ({ roomId, body }: { roomId: number; body: UpdateContributionRoomRequest }) =>
      updateContributionRoom(roomId, body),
  });
}

/**
 * 협력 방 정보를 수정한다. PATCH /api/v1/rooms/{roomId}/coop
 *
 * 성공 후 최신 방 정보는 /topic/room/{roomId} 의 COOP_ROOM_INFO_UPDATED로 반영된다.
 */
export function useUpdateCoopRoom() {
  return useMutation({
    mutationFn: ({ roomId, body }: { roomId: number; body: UpdateCoopRoomRequest }) =>
      updateCoopRoom(roomId, body),
  });
}

/**
 * 방장이 특정 멤버를 추방한다. DELETE /api/v1/rooms/{roomId}/members/{playerId}
 *
 * 성공 후 멤버 목록 변경은 서버의 PLAYER_KICKED 이벤트로 반영된다.
 */
export function useKickRoomMember() {
  return useMutation({
    mutationFn: ({ roomId, playerId }: { roomId: number; playerId: string }) =>
      kickRoomMember(roomId, playerId),
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
  const initFromContributionJoin = useRoomStore((s) => s.initFromContributionJoin);
  return useMutation({
    mutationFn: (roomId: number) => joinContributionRoom(roomId),
    onSuccess: (data) => initFromContributionJoin(data),
    onError: (err) => console.error('[join/contribution] 실패:', err),
  });
}

/**
 * 협력 방에 입장한다. POST /api/v1/rooms/{roomId}/coop/join
 */
export function useJoinCoopRoom() {
  const initFromCoopJoin = useRoomStore((s) => s.initFromCoopJoin);
  return useMutation({
    mutationFn: (roomId: number) => joinCoopRoom(roomId),
    onSuccess: (data) => initFromCoopJoin(data),
    onError: (err) => console.error('[join/coop] 실패:', err),
  });
}
