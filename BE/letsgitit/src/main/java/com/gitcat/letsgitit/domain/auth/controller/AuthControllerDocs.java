package com.gitcat.letsgitit.domain.auth.controller;

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

@Tag(name = "Auth", description = "인증 관련 API")
public interface AuthControllerDocs {

	@Operation(summary = "이메일 인증 코드 발송", description = """
		회원가입 전 이메일 인증용. 인증 코드는 5분간 유효합니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| email: "duplicate@test.com" | 409 EMAIL_DUPLICATE |
		| email: "invalid-email" | 400 INVALID_EMAIL_FORMAT |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"email": "user@example.com"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "인증 메일 발송 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "인증 메일 발송 성공",
			  "data": {"expiredAt": "2026-05-01T09:12:34.123"}
			}
			"""))),
		@ApiResponse(responseCode = "409", description = "이미 가입된 이메일", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "EMAIL_DUPLICATE", value = """
			{"status": 409, "code": "EMAIL_DUPLICATE", "message": "이미 사용 중인 이메일입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "이메일 형식 불일치", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_EMAIL_FORMAT", value = """
			{"status": 400, "code": "INVALID_EMAIL_FORMAT", "message": "이메일 형식이 올바르지 않습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> sendEmailCode(
		@Parameter(name = "purpose", description = "인증 목적 (SIGN_UP / PASSWORD_RESET / WITHDRAW)", required = true)
		String purpose,
		Map<String, Object> body);

	@Operation(summary = "이메일 인증 코드 검증", description = """
		인증 코드 검증 성공 시 서버에서 인증 완료 상태를 Redis에 저장합니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| code: "EXPIRED" | 401 EXPIRED_AUTH_CODE |
		| code: "WRONG" | 400 INVALID_AUTH_CODE |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"email": "user@example.com", "code": "A1B2C3"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "이메일 인증 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "이메일 인증 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "400", description = "인증 코드 불일치", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_AUTH_CODE", value = """
			{"status": 400, "code": "INVALID_AUTH_CODE", "message": "유효하지 않거나 만료된 인증 코드입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "401", description = "인증 코드 만료", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "EXPIRED_AUTH_CODE", value = """
			{"status": 401, "code": "EXPIRED_AUTH_CODE", "message": "인증 코드가 만료되었습니다. (5분 초과)", "errors": []}
			""")))
	})
	ResponseEntity<?> verifyEmailCode(Map<String, Object> body);

	@Operation(summary = "회원가입", description = """
		이메일 인증 완료 후 호출. 탈퇴 후 30일 이내 재가입 시 기존 계정 재활성화.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| email: "duplicate@test.com" | 409 EMAIL_DUPLICATE |
		| email: "unverified@test.com" | 403 EMAIL_NOT_VERIFIED |
		| password: "weak" | 400 INVALID_PASSWORD_FORMAT |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"email": "user@example.com", "password": "password123!"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "201", description = "회원가입 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 201, "message": "회원가입 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "409", description = "이미 사용 중인 이메일", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "EMAIL_DUPLICATE", value = """
			{"status": 409, "code": "EMAIL_DUPLICATE", "message": "이미 사용 중인 이메일입니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "403", description = "이메일 인증 미완료", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "EMAIL_NOT_VERIFIED", value = """
			{"status": 403, "code": "EMAIL_NOT_VERIFIED", "message": "이메일 인증이 완료되지 않았습니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "400", description = "비밀번호 형식 불일치", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_PASSWORD_FORMAT", value = """
			{"status": 400, "code": "INVALID_PASSWORD_FORMAT", "message": "비밀번호 형식이 올바르지 않습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> register(Map<String, Object> body);

	@Operation(summary = "로컬 로그인", description = """
		응답 시 refreshToken이 HttpOnly Cookie로 자동 세팅됩니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| password: "wrongpass" | 401 INVALID_CREDENTIALS |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"email": "user@example.com", "password": "password123!"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "로그인 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "로그인 성공",
			  "data": {
			    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
			    "isFirstLogin": false,
			    "nickname": "dobby",
			    "onboardingStatus": "NONE",
			    "characterHair": "hair_01",
			    "characterHairColor": "color_black",
			    "characterBody": "body_default",
			    "characterEye": "eye_01",
			    "characterOutfit": "outfit_01",
			    "characterOutfitColor": "color_white"
			  }
			}
			"""))),
		@ApiResponse(responseCode = "401", description = "이메일 또는 비밀번호 불일치", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_CREDENTIALS", value = """
			{"status": 401, "code": "INVALID_CREDENTIALS", "message": "이메일 또는 비밀번호가 올바르지 않습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> login(Map<String, Object> body);

	@Operation(summary = "OAuth 임시코드 → Access Token 교환", description = """
		구글 소셜 로그인 콜백에서 받은 1회용 임시코드로 Access Token 발급.
		응답 시 refreshToken이 HttpOnly Cookie로 세팅됩니다.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| code: "EXPIRED_CODE" | 400 INVALID_AUTH_CODE |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"code": "550e8400-e29b-41d4-a716-446655440000"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "로그인 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "로그인 성공",
			  "data": {
			    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
			    "isFirstLogin": false,
			    "nickname": "dobby",
			    "onboardingStatus": "NONE",
			    "characterHair": "hair_01",
			    "characterHairColor": "color_black",
			    "characterBody": "body_default",
			    "characterEye": "eye_01",
			    "characterOutfit": "outfit_01",
			    "characterOutfitColor": "color_white"
			  }
			}
			"""))),
		@ApiResponse(responseCode = "400", description = "임시코드 만료 또는 없음", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_AUTH_CODE", value = """
			{"status": 400, "code": "INVALID_AUTH_CODE", "message": "유효하지 않거나 만료된 인증 코드입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> exchangeToken(Map<String, Object> body);

	@Operation(summary = "Access Token 재발급", description = "Request Body 없음. Refresh Token은 HttpOnly Cookie로 자동 전송됩니다.")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "토큰 재발급 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "토큰 재발급 성공",
			  "data": {"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
			}
			"""))),
		@ApiResponse(responseCode = "401", description = "토큰 유효하지 않음 / 만료", content = @Content(mediaType = "application/json", examples = {
			@ExampleObject(name = "INVALID_TOKEN", value = """
				{"status": 401, "code": "INVALID_TOKEN", "message": "유효하지 않은 토큰입니다.", "errors": []}
				"""),
			@ExampleObject(name = "TOKEN_EXPIRED", value = """
				{"status": 401, "code": "TOKEN_EXPIRED", "message": "액세스 토큰이 만료되었습니다.", "errors": []}
				"""),
			@ExampleObject(name = "REFRESH_TOKEN_EXPIRED", value = """
				{"status": 401, "code": "REFRESH_TOKEN_EXPIRED", "message": "인증 정보가 만료되었습니다. 다시 로그인해주세요.", "errors": []}
				"""),
			@ExampleObject(name = "TOKEN_MISMATCH", value = """
				{"status": 401, "code": "TOKEN_MISMATCH", "message": "저장된 토큰 정보와 일치하지 않습니다.", "errors": []}
				""")
		})),
		@ApiResponse(responseCode = "400", description = "refreshToken 쿠키 누락", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "MISSING_COOKIE", value = """
			{"status": 400, "code": "MISSING_COOKIE", "message": "필수 쿠키가 누락되었습니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> reissueToken();

	@Operation(summary = "로그아웃", description = "Authorization 헤더에 Access Token 필요. Redis의 Refresh Token 삭제 + HttpOnly Cookie 만료.")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "로그아웃 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "로그아웃 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "401", description = "유효하지 않은 토큰", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "INVALID_TOKEN", value = """
			{"status": 401, "code": "INVALID_TOKEN", "message": "유효하지 않은 토큰입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> logout();

	@Operation(summary = "비밀번호 변경 (비밀번호 찾기용, 인증 불필요)", description = """
		이메일 인증 완료 후 호출. 서버에서 인증 완료 상태 확인.

		**Mock 에러 트리거 (테스트용)**
		| 요청값 | 발생 에러 |
		|---|---|
		| email: "notfound@test.com" | 404 MEMBER_NOT_FOUND |
		| email: "oauth@test.com" | 400 OAUTH_ACCOUNT |
		| newPassword: "weak" | 400 INVALID_PASSWORD_FORMAT |
		| newPassword: "samepass" | 409 SAME_AS_CURRENT_PASSWORD |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"email": "user@example.com", "newPassword": "newPassword123!"}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "비밀번호 변경 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{"status": 200, "message": "비밀번호 변경 성공", "data": {}}
			"""))),
		@ApiResponse(responseCode = "404", description = "가입되지 않은 이메일", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "MEMBER_NOT_FOUND", value = """
			{"status": 404, "code": "MEMBER_NOT_FOUND", "message": "존재하지 않는 회원입니다.", "errors": []}
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
	ResponseEntity<?> resetPassword(Map<String, Object> body);
}
