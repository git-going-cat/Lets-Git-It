package com.gitcat.letsgitit.domain.room.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapListResponse;
import com.gitcat.letsgitit.domain.room.dto.request.ChatRequest;
import com.gitcat.letsgitit.domain.room.dto.request.GameStartRequest;
import com.gitcat.letsgitit.domain.room.dto.request.ReadyUpdateRequest;
import com.gitcat.letsgitit.domain.room.dto.response.ChatResponse;
import com.gitcat.letsgitit.domain.room.dto.response.GameStartResult;
import com.gitcat.letsgitit.domain.room.dto.response.HostTransferredResponse;
import com.gitcat.letsgitit.domain.room.dto.response.KickMemberResultResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ReadyChangedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomListResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomSearchResponse;
import com.gitcat.letsgitit.global.enums.RoomMode;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

public interface RoomService {

	// 방 목록 조회 — mode(ALL/CONTRIBUTION/COOP) 필터 적용
	RoomListResponse getRooms(RoomMode mode);

	// 협력 맵 목록 조회
	CoopMapListResponse getCoopMaps();

	// 비밀방 입장 전 비밀번호 평문 검증 — 불일치 시 INVALID_PASSWORD, 성공 시 verified 상태 Redis 저장
	void verifyRoomPassword(Long roomId, String password, UUID memberId);

	// 방 코드로 단건 조회 — 없으면 ROOM_NOT_FOUND, 게임 중이면 ROOM_IN_GAME
	RoomSearchResponse searchByCode(String code);

	// 멤버 추방 (방장만) — NOT_HOST / CANNOT_KICK_SELF / PLAYER_NOT_FOUND / ROOM_IN_GAME
	KickMemberResultResponse kickMember(Long roomId, UUID currentMemberId, String playerId);

	// 방 나가기 — 방장이면 위임 또는 방 해체, 아니면 단순 제거
	void leaveRoom(Long roomId, UUID memberId);

	// 준비 상태 변경 — ROOM_NOT_FOUND / ROOM_IN_GAME / PLAYER_NOT_IN_ROOM
	ReadyChangedResponse updateReadyStatus(UUID memberId, Long roomId, ReadyUpdateRequest request);

	// 채팅 메시지 처리 — 방 존재 확인, 메시지 검증 후 브로드캐스트용 응답 반환
	ChatResponse processChat(Long roomId, UUID memberId, ChatRequest request);

	// 게임 시작 — 검증 후 모드별 응답과 브로드캐스트 경로를 묶어 반환
	GameStartResult startGame(Long roomId, UUID memberId, GameStartRequest request);

	// 방장 위임 — NOT_HOST / PLAYER_NOT_FOUND / SELF_TRANSFER / ROOM_IN_GAME
	HostTransferredResponse transferHost(Long roomId, UUID currentHostId, UUID nextHostId);

	// 현재 방 상태 조회 — 재연결 직후 ROOM_STATE 동기화용
	BaseWebSocketResponse getRoomState(UUID memberId, Long roomId);

	// 협력 게임 종료 후 방 상태를 WAITING으로 복구 — CoopGameService에서 호출
	void resetRoomAfterGame(Long roomId);
}
