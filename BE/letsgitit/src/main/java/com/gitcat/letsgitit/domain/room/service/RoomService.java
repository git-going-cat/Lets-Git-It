package com.gitcat.letsgitit.domain.room.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.room.dto.response.RoomResponse;
import com.gitcat.letsgitit.global.enums.RoomMode;

public interface RoomService {

	// 방 목록 조회 — mode(ALL/CONTRIBUTION/COOP) 필터 적용
	RoomResponse.RoomListResponse getRooms(RoomMode mode);

	// 비밀방 입장 전 비밀번호 검증 — 불일치 시 INVALID_PASSWORD, 성공 시 verified 상태 Redis 저장
	void verifyRoomPassword(Long roomId, String password, UUID memberId);

	// 방 코드로 단건 조회 — 없으면 ROOM_NOT_FOUND, 게임 중이면 ROOM_IN_GAME
	RoomResponse.RoomSearchResponse searchByCode(String code);

	// 멤버 추방 (방장만) — NOT_HOST / CANNOT_KICK_SELF / PLAYER_NOT_FOUND
	void kickMember(Long roomId, UUID currentMemberId, String playerId);

	// 방 나가기 — 방장이면 위임 또는 방 해체, 아니면 단순 제거
	void leaveRoom(Long roomId, UUID memberId);
}
