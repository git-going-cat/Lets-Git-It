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
	@PostMapping("/contribution")
	public ResponseEntity<?> createContributionRoom(@RequestBody
	Map<String, Object> body) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("roomId", 42);
		data.put("roomCode", "A3F9KX");
		data.put("title", body.getOrDefault("title", "같이 기여도 뺏기 해요!"));
		data.put("maxPlayers", body.getOrDefault("maxPlayers", 4));
		data.put("hasPassword", body.getOrDefault("hasPassword", false));
		return ApiResponse.create("기여도 뺏기 모드 방 생성 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/coop")
	public ResponseEntity<?> createCoopRoom(@RequestBody
	Map<String, Object> body) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("roomId", 42);
		data.put("teamName", body.getOrDefault("teamName", "팀이름"));
		data.put("roomCode", "A3F9KX");
		data.put("title", body.getOrDefault("title", "같이 협력 해요!"));
		data.put("hasPassword", body.getOrDefault("hasPassword", false));
		data.put("maxPlayers", 4);
		data.put("selectedMap", buildSelectedMap());
		return ApiResponse.create("협력 모드 방 생성 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping
	public ResponseEntity<?> getRooms(
		@RequestParam(required = false, defaultValue = "ALL")
		String mode) {

		Map<String, Object> contributionRoom = new LinkedHashMap<>();
		contributionRoom.put("roomId", 42);
		contributionRoom.put("title", "같이 기여도 뺏기 해요!");
		contributionRoom.put("mode", "CONTRIBUTION");
		contributionRoom.put("currentPlayers", 2);
		contributionRoom.put("maxPlayers", 4);
		contributionRoom.put("hasPassword", false);
		contributionRoom.put("roomState", "WAITING");
		contributionRoom.put("selectedMap", null);

		Map<String, Object> coopRoom = new LinkedHashMap<>();
		coopRoom.put("roomId", 43);
		coopRoom.put("title", "같이 협력 해요!");
		coopRoom.put("mode", "COOP");
		coopRoom.put("currentPlayers", 2);
		coopRoom.put("maxPlayers", 4);
		coopRoom.put("hasPassword", false);
		coopRoom.put("roomState", "WAITING");
		coopRoom.put("selectedMap", buildSelectedMap());

		Map<String, Object> data = Map.of("rooms", List.of(contributionRoom, coopRoom));
		return ApiResponse.ok("방 목록 조회 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/search")
	public ResponseEntity<?> searchRoom(
		@RequestParam
		String code) {
		if ("XXXXXX".equals(code)) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}
		if ("INGAME1".equals(code)) {
			throw new BusinessException(ROOM_IN_GAME);
		}
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("roomId", 42);
		data.put("title", "같이 기여도 뺏기 해요!");
		data.put("mode", "CONTRIBUTION");
		data.put("currentPlayers", 2);
		data.put("maxPlayers", 4);
		data.put("hasPassword", true);
		data.put("roomState", "WAITING");
		return ApiResponse.ok("방 코드로 검색 성공", data);
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
		return ApiResponse.ok("비밀번호 확인 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/{roomId}/contribution/join")
	public ResponseEntity<?> joinContributionRoom(@PathVariable
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
		data.put("title", "같이 기여도 뺏기 해요!");
		data.put("mode", "CONTRIBUTION");
		data.put("roomState", "WAITING");
		data.put("currentPlayers", 2);
		data.put("maxPlayers", 4);
		data.put("members", List.of(
			buildMember("550e8400-e29b-41d4-a716-446655440000", "dobby", false, true, false),
			buildMember("550e8400-e29b-41d4-a716-446655440001", "alice", false, false, true)));
		return ApiResponse.ok("기여도 뺏기 방 입장 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/{roomId}/coop/join")
	public ResponseEntity<?> joinCoopRoom(@PathVariable
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
		data.put("title", "같이 협력 모드 해요!");
		data.put("teamName", "팀명");
		data.put("mode", "COOP");
		data.put("roomState", "WAITING");
		data.put("currentPlayers", 2);
		data.put("maxPlayers", 4);
		data.put("selectedMap", buildSelectedMap());
		data.put("members", List.of(
			buildMember("550e8400-e29b-41d4-a716-446655440000", "dobby", false, true, false),
			buildMember("550e8400-e29b-41d4-a716-446655440001", "alice", false, false, true)));
		data.put("mapList", List.of(buildSelectedMap()));
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
	@PatchMapping("/{roomId}/contribution")
	public ResponseEntity<?> updateContributionRoom(
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
	@PatchMapping("/{roomId}/coop")
	public ResponseEntity<?> updateCoopRoom(
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
		if ("self".equals(playerId)) {
			throw new BusinessException(CANNOT_KICK_SELF);
		}
		return ApiResponse.ok("추방 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/{roomId}/contribution/state")
	public ResponseEntity<?> getContributionRoomState(@PathVariable
	Long roomId) {
		if (9999L == roomId) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}
		if (9995L == roomId) {
			throw new BusinessException(PLAYER_NOT_IN_ROOM);
		}
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("roomId", roomId);
		data.put("roomCode", "A3F9KX");
		data.put("title", "같이 기여도 뺏기 해요!");
		data.put("mode", "CONTRIBUTION");
		data.put("roomState", "WAITING");
		data.put("currentPlayers", 2);
		data.put("maxPlayers", 4);
		data.put("members", List.of(
			buildMember("550e8400-e29b-41d4-a716-446655440000", "dobby", false, true, false),
			buildMember("550e8400-e29b-41d4-a716-446655440001", "alice", false, false, true)));
		return ApiResponse.ok("방 상태 조회 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/{roomId}/coop/state")
	public ResponseEntity<?> getCoopRoomState(@PathVariable
	Long roomId) {
		if (9999L == roomId) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}
		if (9995L == roomId) {
			throw new BusinessException(PLAYER_NOT_IN_ROOM);
		}
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("roomId", roomId);
		data.put("roomCode", "A3F9KX");
		data.put("title", "같이 협력 모드 해요!");
		data.put("teamName", "팀명");
		data.put("mode", "COOP");
		data.put("roomState", "WAITING");
		data.put("currentPlayers", 2);
		data.put("maxPlayers", 4);
		data.put("selectedMap", buildSelectedMap());
		data.put("members", List.of(
			buildMember("550e8400-e29b-41d4-a716-446655440000", "dobby", false, true, false),
			buildMember("550e8400-e29b-41d4-a716-446655440001", "alice", false, false, true)));
		return ApiResponse.ok("방 상태 조회 성공", data);
	}

	private Map<String, Object> buildMember(String playerId, String nickname, boolean isReady, boolean isHost,
		boolean isMe) {
		Map<String, Object> member = new LinkedHashMap<>();
		member.put("playerId", playerId);
		member.put("nickname", nickname);
		member.put("characterHair", "Hair_01");
		member.put("characterHairColor", "Hairstyle-color_01");
		member.put("characterBody", "Body_01");
		member.put("characterEye", "Eyes_01");
		member.put("characterOutfit", "Outfit_01");
		member.put("characterOutfitColor", "Outfit-color_01");
		member.put("isReady", isReady);
		member.put("isHost", isHost);
		member.put("isMe", isMe);
		return member;
	}

	private Map<String, Object> buildSelectedMap() {
		Map<String, Object> map = new LinkedHashMap<>();
		map.put("mapId", "550e8400-e29b-41d4-a716-446655440002");
		map.put("mapName", "멋깔나는 맵");
		map.put("difficulty", 3);
		return map;
	}
}
