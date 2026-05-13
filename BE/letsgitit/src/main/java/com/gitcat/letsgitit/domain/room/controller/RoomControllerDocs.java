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

	@Operation(summary = "기여도 뺏기 방 생성", description = "hasPassword: true 일 때 password 필수.")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "title": "같이 기여도 뺏기 해요!",
		  "maxPlayers": 4,
		  "hasPassword": true,
		  "password": "1234"
		}
		""")))
	@ApiResponse(responseCode = "201", description = "방 생성 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 201,
		  "message": "기여도 뺏기 모드 방 생성 성공",
		  "data": {
		    "roomId": 42,
		    "roomCode": "A3F9KX",
		    "title": "같이 기여도 뺏기 해요!",
		    "maxPlayers": 4,
		    "hasPassword": true
		  }
		}
		""")))
	ResponseEntity<?> createContributionRoom(Map<String, Object> body);

	@Operation(summary = "협력 모드 방 생성", description = "maxPlayers 고정 4명. hasPassword: true 일 때 password 필수.")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "title": "협력 모드 같이해요!",
		  "teamName": "팀이름",
		  "hasPassword": false,
		  "password": null,
		  "selectedMapId": "550e8400-e29b-41d4-a716-446655440002"
		}
		""")))
	@ApiResponse(responseCode = "201", description = "방 생성 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 201,
		  "message": "협력 모드 방 생성 성공",
		  "data": {
		    "roomId": 42,
		    "teamName": "팀이름",
		    "roomCode": "A3F9KX",
		    "title": "같이 협력 해요!",
		    "hasPassword": false,
		    "maxPlayers": 4,
		    "selectedMap": {
		      "mapId": "550e8400-e29b-41d4-a716-446655440002",
		      "mapName": "재밌는 맵",
		      "difficulty": 3
		    }
		  }
		}
		""")))
	ResponseEntity<?> createCoopRoom(Map<String, Object> body);

	@Operation(summary = "방 목록 조회", description = """
		mode 파라미터로 게임 모드별 방 목록 조회.

		`mode`: `ALL` / `CONTRIBUTION` / `COOP` (기본값 `ALL`)
		""")
	@ApiResponse(responseCode = "200", description = "조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "방 목록 조회 성공",
		  "data": {
		    "rooms": [
		      {
		        "roomId": 42,
		        "title": "같이 기여도 뺏기 해요!",
		        "mode": "CONTRIBUTION",
		        "currentPlayers": 2,
		        "maxPlayers": 4,
		        "hasPassword": false,
		        "roomState": "WAITING",
		        "selectedMap": null
		      },
		      {
		        "roomId": 43,
		        "title": "같이 협력 해요!",
		        "mode": "COOP",
		        "currentPlayers": 2,
		        "maxPlayers": 4,
		        "hasPassword": false,
		        "roomState": "WAITING",
		        "selectedMap": {
		          "mapId": "550e8400-e29b-41d4-a716-446655440002",
		          "mapName": "선택한 맵 이름",
		          "difficulty": 2
		        }
		      }
		    ]
		  }
		}
		""")))
	ResponseEntity<?> getRooms(
		@Parameter(name = "mode", description = "게임 모드 (ALL / CONTRIBUTION / COOP). 기본값 ALL")
		String mode);

	@Operation(summary = "방 코드로 검색", description = """
		6자리 방 코드로 단건 검색.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| code: "XXXXXX" | 404 ROOM_NOT_FOUND |
		| code: "INGAME1" | 409 ROOM_IN_GAME |
		""")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "검색 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "방 코드로 검색 성공",
			  "data": {
			    "roomId": 42,
			    "title": "같이 기여도 뺏기 해요!",
			    "mode": "CONTRIBUTION",
			    "currentPlayers": 2,
			    "maxPlayers": 4,
			    "hasPassword": true,
			    "roomState": "WAITING"
			  }
			}
			"""))),
		@ApiResponse(responseCode = "404", description = "존재하지 않는 방 코드", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "ROOM_NOT_FOUND", value = """
			{"status": 404, "code": "ROOM_NOT_FOUND", "message": "존재하지 않는 방입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "409", description = "이미 게임 중인 방", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "ROOM_IN_GAME", value = """
			{"status": 409, "code": "ROOM_IN_GAME", "message": "이미 게임 중인 방입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> searchRoom(
		@Parameter(name = "code", description = "방 코드 (6자리 영문+숫자)", required = true)
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
			{"status": 200, "message": "비밀번호 확인 성공", "data": {}}
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

	@Operation(summary = "기여도 뺏기 방 입장", description = """
		WebSocket CONNECT → SUBSCRIBE 후 HTTP API 호출.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9999 | 404 ROOM_NOT_FOUND |
		| roomId: 9998 | 409 ROOM_FULL |
		| roomId: 9997 | 409 ROOM_IN_GAME |
		""")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "기여도 뺏기 방 입장 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "기여도 뺏기 방 입장 성공",
			  "data": {
			    "roomId": 42,
			    "roomCode": "A3F9KX",
			    "title": "같이 기여도 뺏기 해요!",
			    "mode": "CONTRIBUTION",
			    "roomState": "WAITING",
			    "currentPlayers": 2,
			    "maxPlayers": 4,
			    "members": [
			      {
			        "playerId": "550e8400-e29b-41d4-a716-446655440000",
			        "nickname": "dobby",
			        "characterHair": "Hair_01",
			        "characterHairColor": "Hairstyle-color_01",
			        "characterBody": "Body_01",
			        "characterEye": "Eyes_01",
			        "characterOutfit": "Outfit_01",
			        "characterOutfitColor": "Outfit-color_01",
			        "isReady": false,
			        "isHost": true,
			        "isMe": false
			      },
			      {
			        "playerId": "550e8400-e29b-41d4-a716-446655440001",
			        "nickname": "alice",
			        "characterHair": "Hair_01",
			        "characterHairColor": "Hairstyle-color_01",
			        "characterBody": "Body_01",
			        "characterEye": "Eyes_01",
			        "characterOutfit": "Outfit_01",
			        "characterOutfitColor": "Outfit-color_01",
			        "isReady": false,
			        "isHost": false,
			        "isMe": true
			      }
			    ]
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
	ResponseEntity<?> joinContributionRoom(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId);

	@Operation(summary = "협력 방 입장", description = """
		WebSocket CONNECT → SUBSCRIBE 후 HTTP API 호출.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9999 | 404 ROOM_NOT_FOUND |
		| roomId: 9998 | 409 ROOM_FULL |
		| roomId: 9997 | 409 ROOM_IN_GAME |
		""")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "협력 방 입장 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "방 입장 성공",
			  "data": {
			    "roomId": 42,
			    "roomCode": "A3F9KX",
			    "title": "같이 협력 모드 해요!",
			    "teamName": "팀명",
			    "mode": "COOP",
			    "roomState": "WAITING",
			    "currentPlayers": 2,
			    "maxPlayers": 4,
			    "selectedMap": {
			      "mapId": "550e8400-e29b-41d4-a716-446655440002",
			      "mapName": "멋깔나는 맵",
			      "difficulty": 3
			    },
			    "members": [
			      {
			        "playerId": "550e8400-e29b-41d4-a716-446655440000",
			        "nickname": "dobby",
			        "characterHair": "Hair_01",
			        "characterHairColor": "Hairstyle-color_01",
			        "characterBody": "Body_01",
			        "characterEye": "Eyes_01",
			        "characterOutfit": "Outfit_01",
			        "characterOutfitColor": "Outfit-color_01",
			        "isReady": false,
			        "isHost": true,
			        "isMe": false
			      },
			      {
			        "playerId": "550e8400-e29b-41d4-a716-446655440001",
			        "nickname": "alice",
			        "characterHair": "Hair_01",
			        "characterHairColor": "Hairstyle-color_01",
			        "characterBody": "Body_01",
			        "characterEye": "Eyes_01",
			        "characterOutfit": "Outfit_01",
			        "characterOutfitColor": "Outfit-color_01",
			        "isReady": false,
			        "isHost": false,
			        "isMe": true
			      }
			    ],
			    "mapList": [
			      {
			        "mapId": "550e8400-e29b-41d4-a716-446655440002",
			        "mapName": "멋깔나는 맵",
			        "difficulty": 3
			      }
			    ]
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
	ResponseEntity<?> joinCoopRoom(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId);

	@Operation(summary = "방 나가기", description = "방장이 나가면 다음 입장 순서 멤버에게 방장 위임.")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "방 나가기 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "방 나가기 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "404", description = "존재하지 않는 방 또는 참여하지 않은 플레이어", content = @Content(mediaType = "application/json", examples = {
			@ExampleObject(name = "ROOM_NOT_FOUND", value = """
				{"status": 404, "code": "ROOM_NOT_FOUND", "message": "존재하지 않는 방입니다.", "errors": []}
				"""),
			@ExampleObject(name = "PLAYER_NOT_IN_ROOM", value = """
				{"status": 403, "code": "PLAYER_NOT_IN_ROOM", "message": "해당 방에 참여하지 않은 플레이어입니다.", "errors": []}
				""")
		}))
	})
	ResponseEntity<?> leaveRoom(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId);

	@Operation(summary = "기여도 뺏기 방 정보 수정 (방장만)", description = """
		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9996 | 403 NOT_HOST |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"title": "변경된 방 제목", "hasPassword": false, "password": null, "maxPlayers": 2}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "방 정보 수정 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "방 정보 수정 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "403", description = "방장이 아님", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NOT_HOST", value = """
			{"status": 403, "code": "NOT_HOST", "message": "방장만 수행할 수 있습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> updateContributionRoom(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId,
		Map<String, Object> body);

	@Operation(summary = "협력 방 정보 수정 (방장만)", description = """
		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9996 | 403 NOT_HOST |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "title": "변경된 방 제목",
		  "teamName": "변경된 팀 이름",
		  "hasPassword": false,
		  "password": null,
		  "selectedMapId": "550e8400-e29b-41d4-a716-446655440002"
		}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "방 정보 수정 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "방 정보 수정 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "403", description = "방장이 아님", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NOT_HOST", value = """
			{"status": 403, "code": "NOT_HOST", "message": "방장만 수행할 수 있습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> updateCoopRoom(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId,
		Map<String, Object> body);

	@Operation(summary = "멤버 추방 (방장만)", description = """
		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9996 | 403 NOT_HOST |
		| playerId: "notfound" | 404 PLAYER_NOT_FOUND |
		| playerId: "self" | 400 CANNOT_KICK_SELF |
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
			"""))),
		@ApiResponse(responseCode = "400", description = "자기 자신 추방 불가", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "CANNOT_KICK_SELF", value = """
			{"status": 400, "code": "CANNOT_KICK_SELF", "message": "자기 자신을 추방할 수 없습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> kickMember(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId,
		@Parameter(name = "playerId", description = "추방할 플레이어 ID (UUID)", required = true)
		String playerId);

	@Operation(summary = "기여도 뺏기 방 상태 조회 (Reconnect fallback)", description = """
		WebSocket 재연결 후 ROOM_STATE 자동 수신이 3초 내 없을 때 REST fallback으로 호출.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9999 | 404 ROOM_NOT_FOUND |
		| roomId: 9995 | 403 PLAYER_NOT_IN_ROOM |
		""")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "방 상태 조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "방 상태 조회 성공",
			  "data": {
			    "roomId": 42,
			    "roomCode": "A3F9KX",
			    "title": "같이 기여도 뺏기 해요!",
			    "mode": "CONTRIBUTION",
			    "roomState": "WAITING",
			    "currentPlayers": 2,
			    "maxPlayers": 4,
			    "members": [
			      {
			        "playerId": "550e8400-e29b-41d4-a716-446655440000",
			        "nickname": "dobby",
			        "characterHair": "Hair_01",
			        "characterHairColor": "Hairstyle-color_01",
			        "characterBody": "Body_01",
			        "characterEye": "Eyes_01",
			        "characterOutfit": "Outfit_01",
			        "characterOutfitColor": "Outfit-color_01",
			        "isReady": false,
			        "isHost": true,
			        "isMe": false
			      },
			      {
			        "playerId": "550e8400-e29b-41d4-a716-446655440001",
			        "nickname": "alice",
			        "characterHair": "Hair_01",
			        "characterHairColor": "Hairstyle-color_01",
			        "characterBody": "Body_01",
			        "characterEye": "Eyes_01",
			        "characterOutfit": "Outfit_01",
			        "characterOutfitColor": "Outfit-color_01",
			        "isReady": false,
			        "isHost": false,
			        "isMe": true
			      }
			    ]
			  }
			}
			"""))),
		@ApiResponse(responseCode = "404", description = "존재하지 않는 방", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "ROOM_NOT_FOUND", value = """
			{"status": 404, "code": "ROOM_NOT_FOUND", "message": "존재하지 않는 방입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "403", description = "해당 방 참여자가 아님", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "PLAYER_NOT_IN_ROOM", value = """
			{"status": 403, "code": "PLAYER_NOT_IN_ROOM", "message": "해당 방에 참여하지 않은 플레이어입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> getContributionRoomState(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId);

	@Operation(summary = "협력 방 상태 조회 (Reconnect fallback)", description = """
		WebSocket 재연결 후 ROOM_STATE 자동 수신이 3초 내 없을 때 REST fallback으로 호출.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| roomId: 9999 | 404 ROOM_NOT_FOUND |
		| roomId: 9995 | 403 PLAYER_NOT_IN_ROOM |
		""")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "방 상태 조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "방 상태 조회 성공",
			  "data": {
			    "roomId": 42,
			    "roomCode": "A3F9KX",
			    "title": "같이 협력 모드 해요!",
			    "teamName": "팀명",
			    "mode": "COOP",
			    "roomState": "WAITING",
			    "currentPlayers": 2,
			    "maxPlayers": 4,
			    "selectedMap": {
			      "mapId": "550e8400-e29b-41d4-a716-446655440002",
			      "mapName": "멋깔나는 맵",
			      "difficulty": 3
			    },
			    "members": [
			      {
			        "playerId": "550e8400-e29b-41d4-a716-446655440000",
			        "nickname": "dobby",
			        "characterHair": "Hair_01",
			        "characterHairColor": "Hairstyle-color_01",
			        "characterBody": "Body_01",
			        "characterEye": "Eyes_01",
			        "characterOutfit": "Outfit_01",
			        "characterOutfitColor": "Outfit-color_01",
			        "isReady": false,
			        "isHost": true,
			        "isMe": false
			      },
			      {
			        "playerId": "550e8400-e29b-41d4-a716-446655440001",
			        "nickname": "alice",
			        "characterHair": "Hair_01",
			        "characterHairColor": "Hairstyle-color_01",
			        "characterBody": "Body_01",
			        "characterEye": "Eyes_01",
			        "characterOutfit": "Outfit_01",
			        "characterOutfitColor": "Outfit-color_01",
			        "isReady": false,
			        "isHost": false,
			        "isMe": true
			      }
			    ]
			  }
			}
			"""))),
		@ApiResponse(responseCode = "404", description = "존재하지 않는 방", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "ROOM_NOT_FOUND", value = """
			{"status": 404, "code": "ROOM_NOT_FOUND", "message": "존재하지 않는 방입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "403", description = "해당 방 참여자가 아님", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "PLAYER_NOT_IN_ROOM", value = """
			{"status": 403, "code": "PLAYER_NOT_IN_ROOM", "message": "해당 방에 참여하지 않은 플레이어입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> getCoopRoomState(
		@Parameter(name = "roomId", description = "방 ID", required = true)
		Long roomId);
}
