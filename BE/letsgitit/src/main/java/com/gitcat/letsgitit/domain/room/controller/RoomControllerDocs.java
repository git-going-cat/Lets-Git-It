package com.gitcat.letsgitit.domain.room.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Room", description = "멀티플레이 방 관련 API")
public interface RoomControllerDocs {

	@Operation(summary = "방 생성", description = "협력 모드는 maxPlayers 고정 4명. hasPassword: true 일 때 password 필수.")
	@RequestBody(content = @Content(mediaType = "application/json", examples = {
		@ExampleObject(name = "스피드런/타임어택", value = """
			{
			  "title": "같이 스피드런 해요!",
			  "mode": "CONTRIBUTION_RUN",
			  "maxPlayers": 4,
			  "hasPassword": true,
			  "password": "1234"
			}
			"""),
		@ExampleObject(name = "협력 모드", value = """
			{"title": "협력 모드 같이해요!", "mode": "COOP", "hasPassword": false}
			""")
	}))
	@ApiResponse(responseCode = "201", description = "방 생성 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 201,
		  "message": "방 생성 성공",
		  "data": {
		    "roomId": 42,
		    "roomCode": "A3F9KX",
		    "title": "같이 스피드런 해요!",
		    "mode": "CONTRIBUTION_RUN",
		    "maxPlayers": 4,
		    "hasPassword": true
		  }
		}
		""")))
	ResponseEntity<?> createRoom(Map<String, Object> body);

	@Operation(summary = "방 목록 조회 / 방 코드로 검색", description = """
		code 파라미터 있으면 방 코드 검색(단건), 없으면 mode별 방 목록 조회.

		**Mock 에러 트리거 (코드 검색 시, 테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| code: "XXXXXX" | 404 ROOM_NOT_FOUND |
		| code: "INGAME1" | 409 ROOM_IN_GAME |
		""")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "조회 성공", content = @Content(mediaType = "application/json", examples = {
			@ExampleObject(name = "방 목록 조회", value = """
				{
				  "status": 200,
				  "message": "방 목록 조회 성공",
				  "data": {
				    "rooms": [
				      {
				        "roomId": 42,
				        "title": "같이 스피드런 해요!",
				        "mode": "CONTRIBUTION_RUN",
				        "currentPlayers": 2,
				        "maxPlayers": 4,
				        "hasPassword": false,
				        "status": "WAITING"
				      }
				    ]
				  }
				}
				"""),
			@ExampleObject(name = "방 코드 검색", value = """
				{
				  "status": 200,
				  "message": "방 코드로 검색 성공",
				  "data": {
				    "roomId": 42,
				    "title": "같이 스피드런 해요!",
				    "mode": "CONTRIBUTION_RUN",
				    "currentPlayers": 2,
				    "maxPlayers": 4,
				    "hasPassword": true,
				    "status": "WAITING"
				  }
				}
				""")
		})),
		@ApiResponse(responseCode = "404", description = "존재하지 않는 방 코드", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "ROOM_NOT_FOUND", value = """
			{"status": 404, "code": "ROOM_NOT_FOUND", "message": "존재하지 않는 방입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "409", description = "이미 게임 중인 방", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "ROOM_IN_GAME", value = """
			{"status": 409, "code": "ROOM_IN_GAME", "message": "이미 게임 중인 방입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> getRooms(
		@Parameter(name = "mode", description = "게임 모드 (ALL / CONTRIBUTION_RUN / TIME_ATTACK / COOP). 기본값 ALL")
		String mode,
		@Parameter(name = "code", description = "방 코드 (6자리). 지정 시 코드 검색 모드")
		String code);

	@Operation(summary = "방 비밀번호 검증", description = """
		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9999 | 404 ROOM_NOT_FOUND |
		| password: "wrong" | 400 INVALID_PASSWORD |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"password": "1234"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "비밀번호 확인 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "비밀번호 확인 성공", "data": {"verified": true}}
			"""))),
		@ApiResponse(responseCode = "404", description = "존재하지 않는 방", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "ROOM_NOT_FOUND", value = """
			{"status": 404, "code": "ROOM_NOT_FOUND", "message": "존재하지 않는 방입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "비밀번호 불일치", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_PASSWORD", value = """
			{"status": 400, "code": "INVALID_PASSWORD", "message": "비밀번호가 일치하지 않습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> verifyRoomPassword(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId,
		Map<String, Object> body);

	@Operation(summary = "방 입장", description = """
		입장 후 현재 방 상태 및 참여 인원 목록을 반환합니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9999 | 404 ROOM_NOT_FOUND |
		| roomId: 9998 | 409 ROOM_FULL |
		| roomId: 9997 | 409 ROOM_IN_GAME |
		""")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "방 입장 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "방 입장 성공",
			  "data": {
			    "roomId": 42,
			    "roomCode": "A3F9KX",
			    "title": "같이 스피드런 해요!",
			    "mode": "CONTRIBUTION_RUN",
			    "currentPlayers": 3,
			    "maxPlayers": 4,
			    "members": [
			      {
			        "playerId": "550e8400-e29b-41d4-a716-446655440000",
			        "nickname": "dobby",
			        "characterHair": "hair_01",
			        "characterHairColor": "color_black",
			        "characterBody": "body_default",
			        "characterEye": "eye_01",
			        "characterOutfit": "outfit_01",
			        "characterOutfitColor": "color_white",
			        "isHost": true,
			        "isMe": false
			      }
			    ],
			    "mapList": []
			  }
			}
			"""))),
		@ApiResponse(responseCode = "404", description = "존재하지 않는 방", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "ROOM_NOT_FOUND", value = """
			{"status": 404, "code": "ROOM_NOT_FOUND", "message": "존재하지 않는 방입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "409", description = "방 정원 초과 또는 게임 중", content = @Content(mediaType = "application/json", examples = {
			@ExampleObject(name = "ROOM_FULL", value = """
				{"status": 409, "code": "ROOM_FULL", "message": "방 정원이 초과되었습니다.", "errors": []}
				"""),
			@ExampleObject(name = "ROOM_IN_GAME", value = """
				{"status": 409, "code": "ROOM_IN_GAME", "message": "이미 게임 중인 방입니다.", "errors": []}
				""")
		}))
	})
	ResponseEntity<?> joinRoom(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId);

	@Operation(summary = "방 나가기", description = "방장이 나가면 다음 입장 순서 멤버에게 방장 위임.")
	@ApiResponse(responseCode = "200", description = "방 나가기 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"status": 200, "message": "방 나가기 성공", "data": null}
		""")))
	ResponseEntity<?> leaveRoom(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId);

	@Operation(summary = "방 정보 수정 (방장만)", description = """
		협력 모드에서는 maxPlayers 수정 불가.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9996 | 403 NOT_HOST |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"title": "변경된 방 제목", "hasPassword": false, "maxPlayers": 2}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "방 정보 수정 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "방 정보 수정 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "403", description = "방장이 아님", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NOT_HOST", value = """
			{"status": 403, "code": "NOT_HOST", "message": "방장만 수행할 수 있습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> updateRoom(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId,
		Map<String, Object> body);

	@Operation(summary = "멤버 추방 (방장만)", description = """
		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9996 | 403 NOT_HOST |
		| playerId: "notfound" | 404 PLAYER_NOT_FOUND |
		""")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "추방 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "추방 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "403", description = "방장이 아님", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NOT_HOST", value = """
			{"status": 403, "code": "NOT_HOST", "message": "방장만 수행할 수 있습니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "404", description = "해당 플레이어 없음", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "PLAYER_NOT_FOUND", value = """
			{"status": 404, "code": "PLAYER_NOT_FOUND", "message": "해당 플레이어를 찾을 수 없습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> kickMember(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId,
		@Parameter(name = "playerId", description = "추방할 플레이어 ID (UUID)", required = true)
		String playerId);
}
