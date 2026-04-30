package com.gitcat.letsgitit.domain.room.controller;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.response.ApiResponse;

@RestController
@RequestMapping("/api/v1/rooms")
public class RoomController implements RoomControllerDocs {

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping
	public ResponseEntity<?> createRoom(@RequestBody
	Map<String, Object> body) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("roomId", 42);
		data.put("roomCode", "A3F9KX");
		data.put("title", body.getOrDefault("title", "같이 스피드런 해요!"));
		data.put("mode", body.getOrDefault("mode", "CONTRIBUTION_RUN"));
		data.put("maxPlayers", body.getOrDefault("maxPlayers", 4));
		data.put("hasPassword", body.getOrDefault("hasPassword", false));
		return ApiResponse.create("방 생성 성공", data);
	}

	// 방 목록 조회(mode) / 방 코드로 검색(code) - 동일 URL, 파라미터로 분기
	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping
	public ResponseEntity<?> getRooms(
		@RequestParam(required = false, defaultValue = "ALL")
		String mode,
		@RequestParam(required = false)
		String code) {

		if (code != null) {
			if ("XXXXXX".equals(code)) {
				throw new BusinessException(ROOM_NOT_FOUND);
			}
			if ("INGAME1".equals(code)) {
				throw new BusinessException(ROOM_IN_GAME);
			}
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("roomId", 42);
			data.put("title", "같이 스피드런 해요!");
			data.put("mode", "CONTRIBUTION_RUN");
			data.put("currentPlayers", 2);
			data.put("maxPlayers", 4);
			data.put("hasPassword", true);
			data.put("status", "WAITING");
			return ApiResponse.ok("방 코드로 검색 성공", data);
		}

		Map<String, Object> data = Map.of(
			"rooms", List.of(
				Map.of(
					"roomId", 42,
					"title", "같이 스피드런 해요!",
					"mode", "CONTRIBUTION_RUN",
					"currentPlayers", 2,
					"maxPlayers", 4,
					"hasPassword", false,
					"status", "WAITING"),
				Map.of(
					"roomId", 43,
					"title", "타임어택 고수 모여라",
					"mode", "TIME_ATTACK",
					"currentPlayers", 1,
					"maxPlayers", 4,
					"hasPassword", false,
					"status", "WAITING"),
				Map.of(
					"roomId", 44,
					"title", "협력 초보도 환영",
					"mode", "COOP",
					"currentPlayers", 3,
					"maxPlayers", 4,
					"hasPassword", false,
					"status", "WAITING")));
		return ApiResponse.ok("방 목록 조회 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/{roomId}/password/verify")
	public ResponseEntity<?> verifyRoomPassword(
		@PathVariable
		Long roomId,
		@RequestBody
		Map<String, Object> body) {
		if (9999L == roomId) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}
		String password = (String)body.getOrDefault("password", "");
		if ("wrong".equals(password)) {
			throw new BusinessException(INVALID_PASSWORD);
		}
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("verified", true);
		return ApiResponse.ok("비밀번호 확인 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/{roomId}/join")
	public ResponseEntity<?> joinRoom(@PathVariable
	Long roomId) {
		if (9999L == roomId) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}
		if (9998L == roomId) {
			throw new BusinessException(ROOM_FULL);
		}
		if (9997L == roomId) {
			throw new BusinessException(ROOM_IN_GAME);
		}
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("roomId", roomId);
		data.put("roomCode", "A3F9KX");
		data.put("title", "같이 스피드런 해요!");
		data.put("mode", "CONTRIBUTION_RUN");
		data.put("currentPlayers", 3);
		data.put("maxPlayers", 4);
		data.put("members", List.of(
			buildMember("550e8400-e29b-41d4-a716-446655440000", "dobby", true, false),
			buildMember("550e8400-e29b-41d4-a716-446655440001", "alice", false, false),
			buildMember("550e8400-e29b-41d4-a716-446655440002", "me", false, true)));
		data.put("mapList", List.of());
		return ApiResponse.ok("방 입장 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@DeleteMapping("/{roomId}/leave")
	public ResponseEntity<?> leaveRoom(@PathVariable
	Long roomId) {
		return ApiResponse.ok("방 나가기 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PatchMapping("/{roomId}")
	public ResponseEntity<?> updateRoom(
		@PathVariable
		Long roomId,
		@RequestBody
		Map<String, Object> body) {
		if (9996L == roomId) {
			throw new BusinessException(NOT_HOST);
		}
		return ApiResponse.ok("방 정보 수정 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@DeleteMapping("/{roomId}/members/{playerId}")
	public ResponseEntity<?> kickMember(
		@PathVariable
		Long roomId,
		@PathVariable
		String playerId) {
		if (9996L == roomId) {
			throw new BusinessException(NOT_HOST);
		}
		if ("notfound".equals(playerId)) {
			throw new BusinessException(PLAYER_NOT_FOUND);
		}
		return ApiResponse.ok("추방 성공");
	}

	private Map<String, Object> buildMember(String playerId, String nickname, boolean isHost, boolean isMe) {
		Map<String, Object> member = new LinkedHashMap<>();
		member.put("playerId", playerId);
		member.put("nickname", nickname);
		member.put("characterHair", "hair_01");
		member.put("characterHairColor", "color_black");
		member.put("characterBody", "body_default");
		member.put("characterEye", "eye_01");
		member.put("characterOutfit", "outfit_01");
		member.put("characterOutfitColor", "color_white");
		member.put("isHost", isHost);
		member.put("isMe", isMe);
		return member;
	}
}
