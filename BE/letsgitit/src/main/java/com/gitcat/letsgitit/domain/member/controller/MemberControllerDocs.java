package com.gitcat.letsgitit.domain.member.controller;

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

@Tag(name = "Member", description = "회원 관련 API")
public interface MemberControllerDocs {

	@Operation(summary = "튜토리얼 완료", description = "튜토리얼 완료 처리. 해당 유저의 온보딩 step 값을 변경합니다.")
	@ApiResponse(responseCode = "200", description = "튜토리얼 완료", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"status": 200, "message": "튜토리얼 완료", "data": {}}
		""")))
	ResponseEntity<?> completeTutorial();

	@Operation(summary = "내 정보 조회 (마이페이지)", description = "로그인한 사용자의 프로필 및 모드별 기록을 조회합니다.")
	@ApiResponse(responseCode = "200", description = "내 정보 조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "내 정보 조회 성공",
		  "data": {
		    "nickname": "dobby",
		    "authType": "LOCAL",
		    "email": "user@example.com",
		    "totalPlayTime": 37200,
		    "characterHair": "hair_01",
		    "characterHairColor": "color_black",
		    "characterBody": "body_default",
		    "characterEye": "eye_01",
		    "characterOutfit": "outfit_01",
		    "characterOutfitColor": "color_white",
		    "records": [
		      {"mode": "SINGLE_EASY", "bestScore": 9500, "bestRank": 12},
		      {"mode": "SINGLE_NORMAL", "bestScore": 7200, "bestRank": 45},
		      {"mode": "SINGLE_HARD", "bestScore": 5100, "bestRank": 103},
		      {"mode": "CONTRIBUTION_RUN", "totalContribution": 88000, "bestRank": 7},
		      {"mode": "TIME_ATTACK", "totalCount": 10500, "bestRank": 3},
		      {"mode": "COOP", "bestClearTime": 61000, "bestRank": 2}
		    ]
		  }
		}
		""")))
	ResponseEntity<?> getMyInfo();

	@Operation(summary = "캐릭터 에셋 저장", description = "캐릭터 외형 정보를 저장합니다.")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "characterHair": "hair_01",
		  "characterHairColor": "color_black",
		  "characterBody": "body_default",
		  "characterEye": "eye_01",
		  "characterOutfit": "outfit_01",
		  "characterOutfitColor": "color_white"
		}
		""")))
	@ApiResponse(responseCode = "200", description = "캐릭터 에셋 저장 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"status": 200, "message": "캐릭터 에셋 저장 성공", "data": {}}
		""")))
	ResponseEntity<?> saveCharacter(Map<String, Object> body);

	@Operation(summary = "닉네임 저장 (온보딩)", description = """
		최초 로그인 온보딩 시 닉네임을 설정합니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| nickname: "taken" | 409 NICKNAME_DUPLICATED |
		| nickname: "a" | 400 NICKNAME_INVALID |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"nickname": "dobby"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "닉네임 저장 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "닉네임 저장 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "409", description = "중복된 닉네임", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NICKNAME_DUPLICATED", value = """
			{"status": 409, "code": "NICKNAME_DUPLICATED", "message": "이미 사용 중인 닉네임입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "닉네임 형식 불일치", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NICKNAME_INVALID", value = """
			{"status": 400, "code": "NICKNAME_INVALID", "message": "닉네임 형식이 올바르지 않습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> saveNickname(Map<String, Object> body);

	@Operation(summary = "닉네임 수정", description = """
		기존 닉네임을 새 닉네임으로 변경합니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| nickname: "taken" | 409 NICKNAME_DUPLICATED |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"nickname": "newdobby"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "닉네임 변경 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "닉네임 변경 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "409", description = "이미 사용 중인 닉네임", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NICKNAME_DUPLICATED", value = """
			{"status": 409, "code": "NICKNAME_DUPLICATED", "message": "이미 사용 중인 닉네임입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> updateNickname(Map<String, Object> body);

	@Operation(summary = "닉네임 중복 확인", description = "닉네임 사용 가능 여부를 확인합니다. 탈퇴 회원 닉네임도 재사용 불가.")

	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "사용할 수 있는 닉네임", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "사용할 수 있는 닉네임", "data": {}}
			"""))),
		@ApiResponse(responseCode = "409", description = "이미 사용 중인 닉네임", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NICKNAME_DUPLICATED", value = """
			{"status": 409, "code": "NICKNAME_DUPLICATED", "message": "이미 사용 중인 닉네임입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> checkNickname(
		@Parameter(name = "nickname", description = "확인할 닉네임", required = true)
		String nickname);

	@Operation(summary = "회원탈퇴", description = "soft delete 처리. 탈퇴 후 30일 이내 재가입 시 기존 계정 재활성화.")
	@ApiResponse(responseCode = "200", description = "회원탈퇴 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"status": 200, "message": "회원탈퇴 성공", "data": {}}
		""")))
	ResponseEntity<?> withdraw();

	@Operation(summary = "비밀번호 변경 (마이페이지, 인증 필요)", description = """
		Authorization 헤더에 Access Token 필요. 비밀번호 검증 API 호출 후 사용.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| newPassword: "weak" | 400 INVALID_PASSWORD_FORMAT |
		| newPassword: "samepass" | 409 SAME_AS_CURRENT_PASSWORD |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"newPassword": "newPassword123!"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "비밀번호 변경 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "비밀번호 변경 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "400", description = "비밀번호 형식 불일치 또는 소셜 로그인 계정", content = @Content(mediaType = "application/json", examples = {
			@ExampleObject(name = "INVALID_PASSWORD_FORMAT", value = """
				{"status": 400, "code": "INVALID_PASSWORD_FORMAT", "message": "비밀번호 형식이 올바르지 않습니다.", "errors": []}
				"""),
			@ExampleObject(name = "OAUTH_ACCOUNT", value = """
				{"status": 400, "code": "OAUTH_ACCOUNT", "message": "소셜 로그인 계정은 비밀번호를 사용할 수 없습니다.", "errors": []}
				""")
		})),
		@ApiResponse(responseCode = "409", description = "현재 비밀번호와 동일", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "SAME_AS_CURRENT_PASSWORD", value = """
			{"status": 409, "code": "SAME_AS_CURRENT_PASSWORD", "message": "현재 비밀번호와 동일합니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> changePassword(Map<String, Object> body);

	@Operation(summary = "비밀번호 검증", description = """
		비밀번호 변경 전 현재 비밀번호를 검증합니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| password: "wrongpass" | 401 PASSWORD_MISMATCH |
		| password: "oauth" | 400 OAUTH_ACCOUNT |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"password": "currentPassword123!"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "비밀번호 검증 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "비밀번호 검증 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "401", description = "비밀번호 불일치", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "PASSWORD_MISMATCH", value = """
			{"status": 401, "code": "PASSWORD_MISMATCH", "message": "비밀번호가 일치하지 않습니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "소셜 로그인 계정", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "OAUTH_ACCOUNT", value = """
			{"status": 400, "code": "OAUTH_ACCOUNT", "message": "소셜 로그인 계정은 비밀번호를 사용할 수 없습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> verifyPassword(Map<String, Object> body);
}
