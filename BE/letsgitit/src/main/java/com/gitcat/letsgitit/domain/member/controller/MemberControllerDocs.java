package com.gitcat.letsgitit.domain.member.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;

import com.gitcat.letsgitit.domain.member.dto.request.ChangePasswordRequest;
import com.gitcat.letsgitit.domain.member.dto.request.NicknameRequest;
import com.gitcat.letsgitit.domain.member.dto.request.SaveCharacterRequest;
import com.gitcat.letsgitit.domain.member.dto.request.VerifyPasswordRequest;
import com.gitcat.letsgitit.domain.member.dto.request.WithdrawRequest;
import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;

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
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "튜토리얼 완료", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "튜토리얼 완료", "data": {}}
			"""))),
		@ApiResponse(responseCode = "404", description = "회원 없음", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "MEMBER_NOT_FOUND", value = """
			{"status": 404, "code": "MEMBER_NOT_FOUND", "message": "존재하지 않는 회원입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "닉네임 미설정 또는 튜토리얼 이미 완료", content = @Content(mediaType = "application/json", examples = {
			@ExampleObject(name = "NICKNAME_NOT_SET", value = """
				{"status": 400, "code": "NICKNAME_NOT_SET", "message": "닉네임이 설정되지 않았습니다.", "errors": []}
				"""),
			@ExampleObject(name = "TUTORIAL_ALREADY_COMPLETED", value = """
				{"status": 400, "code": "TUTORIAL_ALREADY_COMPLETED", "message": "이미 튜토리얼을 완료했습니다.", "errors": []}
				""")
		}))
	})
	ResponseEntity<?> completeTutorial(@Parameter(hidden = true)
	CustomUserDetails userDetails);

	@Operation(summary = "내 정보 조회 (마이페이지)", description = "로그인한 사용자의 프로필 및 모드별 기록을 조회합니다.")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "내 정보 조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "내 정보 조회 성공",
			  "data": {
			    "memberId": "550e8400-e29b-41d4-a716-446655440000",
			    "nickname": "dobby",
			    "authType": "LOCAL",
			    "provider": null,
			    "email": "user@example.com",
			    "onboardingStatus": "TUTORIAL_DONE",
			    "totalPlayTime": 37200,
			    "characterHair": "Hairstyle_01",
			    "characterHairColor": "Hairstyle-color_01",
			    "characterBody": "Body_01",
			    "characterEye": "Eyes_01",
			    "characterOutfit": "Outfit_01",
			    "characterOutfitColor": "Outfit-color_01",
			    "records": [
			      { "mode": "SINGLE_EASY",      "bestScore": 9500 },
			      { "mode": "SINGLE_NORMAL",    "bestScore": 7200 },
			      { "mode": "SINGLE_HARD",      "bestScore": 5100 },
			      { "mode": "CONTRIBUTION",     "totalContribution": 88000 },
			      { "mode": "TIME_ATTACK",      "totalCount": 10500},
			      { "mode": "COOP",             "bestClearTime": 61000 }
			    ]
			  }
			}
			"""))),
		@ApiResponse(responseCode = "404", description = "회원 없음", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "MEMBER_NOT_FOUND", value = """
			{"status": 404, "code": "MEMBER_NOT_FOUND", "message": "존재하지 않는 회원입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> getMyInfo(@Parameter(hidden = true)
	CustomUserDetails userDetails);

	@Operation(summary = "캐릭터 에셋 저장", description = "캐릭터 외형 정보를 저장합니다.")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "characterHair": "Hairstyle_01",
		  "characterHairColor": "Hairstyle-color_01",
		  "characterBody": "Body_01",
		  "characterEye": "Eyes_01",
		  "characterOutfit": "Outfit_01",
		  "characterOutfitColor": "Outfit-color_01"
		}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "캐릭터 에셋 저장 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "캐릭터 에셋 저장 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "404", description = "회원 없음", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "MEMBER_NOT_FOUND", value = """
			{"status": 404, "code": "MEMBER_NOT_FOUND", "message": "존재하지 않는 회원입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "요청값 검증 실패", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_INPUT_VALUE", value = """
			{"status": 400, "code": "INVALID_INPUT_VALUE", "message": "잘못된 값의 파라미터입니다.", "errors": [{"field": "characterHair", "value": "", "reason": "헤어 스타일은 필수입니다."}]}
			"""))),
		@ApiResponse(responseCode = "400", description = "요청값 검증 실패", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_INPUT_VALUE", value = """
			{"status": 400, "code": "INVALID_INPUT_VALUE", "message": "잘못된 값의 파라미터입니다.", "errors": [{"field": "characterHair", "value": "Hair_01", "reason": "헤어 스타일은 Hairstyle_01 형식이어야 합니다."}]}
			""")))
	})
	ResponseEntity<?> saveCharacter(@Parameter(hidden = true)
	CustomUserDetails userDetails, @Valid
	SaveCharacterRequest request);

	@Operation(summary = "닉네임 저장 (온보딩)", description = """
		최초 로그인 온보딩 시 닉네임을 설정합니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| nickname: "taken" | 409 NICKNAME_DUPLICATE |
		| nickname: "a" | 400 INVALID_INPUT_VALUE |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"nickname": "dobby"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "닉네임 저장 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "닉네임 저장 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "409", description = "중복된 닉네임", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NICKNAME_DUPLICATE", value = """
			{"status": 409, "code": "NICKNAME_DUPLICATE", "message": "이미 사용 중인 닉네임입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "404", description = "회원 없음", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "MEMBER_NOT_FOUND", value = """
			{"status": 404, "code": "MEMBER_NOT_FOUND", "message": "존재하지 않는 회원입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "닉네임 형식 불일치 또는 이미 닉네임 설정됨", content = @Content(mediaType = "application/json", examples = {
			@ExampleObject(name = "INVALID_INPUT_VALUE", value = """
				{"status": 400, "code": "INVALID_INPUT_VALUE", "message": "잘못된 값의 파라미터입니다.", "errors": [{"field": "nickname", "value": "a", "reason": "닉네임은 2~6자여야 합니다."}]}
				"""),
			@ExampleObject(name = "NICKNAME_ALREADY_SET", value = """
				{"status": 400, "code": "NICKNAME_ALREADY_SET", "message": "이미 닉네임이 설정되어 있습니다. 닉네임 수정을 요청해주세요.", "errors": []}
				""")
		}))
	})
	ResponseEntity<?> saveNickname(@Parameter(hidden = true)
	CustomUserDetails userDetails, @Valid
	NicknameRequest request);

	@Operation(summary = "닉네임 수정", description = """
		기존 닉네임을 새 닉네임으로 변경합니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| nickname: "taken" | 409 NICKNAME_DUPLICATE |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"nickname": "newcat"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "닉네임 변경 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "닉네임 변경 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "409", description = "이미 사용 중인 닉네임", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NICKNAME_DUPLICATE", value = """
			{"status": 409, "code": "NICKNAME_DUPLICATE", "message": "이미 사용 중인 닉네임입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "404", description = "회원 없음", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "MEMBER_NOT_FOUND", value = """
			{"status": 404, "code": "MEMBER_NOT_FOUND", "message": "존재하지 않는 회원입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "닉네임 형식 불일치", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_INPUT_VALUE", value = """
			{"status": 400, "code": "INVALID_INPUT_VALUE", "message": "잘못된 값의 파라미터입니다.", "errors": [{"field": "nickname", "value": "a", "reason": "닉네임은 2~6자여야 합니다."}]}
			""")))
	})
	ResponseEntity<?> updateNickname(@Parameter(hidden = true)
	CustomUserDetails userDetails, @Valid
	NicknameRequest request);

	@Operation(summary = "닉네임 중복 확인", description = "닉네임 사용 가능 여부를 확인합니다. 탈퇴 회원 닉네임도 재사용 불가.")

	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "사용할 수 있는 닉네임", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "사용할 수 있는 닉네임", "data": {}}
			"""))),
		@ApiResponse(responseCode = "409", description = "이미 사용 중인 닉네임", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "NICKNAME_DUPLICATE", value = """
			{"status": 409, "code": "NICKNAME_DUPLICATE", "message": "이미 사용 중인 닉네임입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "닉네임 형식 불일치", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_INPUT_VALUE", value = """
			{"status": 400, "code": "INVALID_INPUT_VALUE", "message": "잘못된 값의 파라미터입니다.", "errors": [{"field": "nickname", "value": "a", "reason": "닉네임은 2~6자여야 합니다."}]}
			""")))
	})
	ResponseEntity<?> checkNickname(
		@Parameter(name = "nickname", description = "확인할 닉네임", required = true) @NotBlank(message = "닉네임을 입력해주세요.") @Size(min = 2, max = 6, message = "닉네임은 2~6자여야 합니다.") @Pattern(regexp = "^[가-힣a-zA-Z0-9]+$", message = "닉네임은 한글, 영문, 숫자만 사용 가능합니다.")
		String nickname);

	@Operation(summary = "회원탈퇴", description = "soft delete 처리. 탈퇴 후 30일 이내 재가입 시 기존 계정 재활성화.")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"password": "currentPassword123!"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "회원탈퇴 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "회원탈퇴 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "401", description = "비밀번호 불일치 (LOCAL 계정)", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_CREDENTIALS", value = """
			{"status": 401, "code": "INVALID_CREDENTIALS", "message": "이메일 또는 비밀번호가 올바르지 않습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> withdraw(
		@Parameter(hidden = true)
		CustomUserDetails userDetails,
		WithdrawRequest request,
		HttpServletRequest httpRequest,
		HttpServletResponse httpResponse);

	@Operation(summary = "비밀번호 검증 (마이페이지, 인증 필요)", description = "현재 비밀번호를 검증하고 Redis에 인증 상태를 저장한다. 이후 비밀번호 변경 API 호출 시 이 상태를 확인한다.")
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
	ResponseEntity<?> verifyPassword(@Parameter(hidden = true)
	CustomUserDetails userDetails,
		@Valid
		VerifyPasswordRequest request);

	@Operation(summary = "비밀번호 변경 (마이페이지, 인증 필요)", description = "비밀번호 검증 API 호출 후 Redis 키가 존재할 때만 변경 가능. 변경 성공 시 Redis 키 즉시 삭제.")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"currentPassword": "currentPassword123!", "newPassword": "newPassword456!"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "비밀번호 변경 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "비밀번호 변경 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "403", description = "비밀번호 검증 단계 미수행", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "PASSWORD_VERIFY_REQUIRED", value = """
			{"status": 403, "code": "PASSWORD_VERIFY_REQUIRED", "message": "비밀번호 검증이 필요합니다. 먼저 비밀번호를 검증해주세요.", "errors": []}
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
	ResponseEntity<?> changePassword(@Parameter(hidden = true)
	CustomUserDetails userDetails,
		@Valid
		ChangePasswordRequest request);
}
