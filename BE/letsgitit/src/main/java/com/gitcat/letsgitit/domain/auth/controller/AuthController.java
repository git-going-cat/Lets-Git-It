package com.gitcat.letsgitit.domain.auth.controller;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.response.ApiResponse;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController implements AuthControllerDocs {

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/email/send")
	public ResponseEntity<?> sendEmailCode(
		@RequestParam
		String purpose,
		@RequestBody
		Map<String, Object> body) {
		String email = (String)body.getOrDefault("email", "");
		if ("duplicate@test.com".equals(email)) {
			throw new BusinessException(EMAIL_DUPLICATE);
		}
		if (!email.contains("@")) {
			throw new BusinessException(INVALID_EMAIL_FORMAT);
		}
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("expiredAt", "2026-05-01T09:12:34.123");
		return ApiResponse.ok("인증 메일 발송 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/email/verify")
	public ResponseEntity<?> verifyEmailCode(@RequestBody
	Map<String, Object> body) {
		String code = (String)body.getOrDefault("code", "");
		if ("EXPIRED".equals(code)) {
			throw new BusinessException(EXPIRED_AUTH_CODE);
		}
		if ("WRONG".equals(code)) {
			throw new BusinessException(INVALID_AUTH_CODE);
		}
		return ApiResponse.ok("이메일 인증 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/register")
	public ResponseEntity<?> register(@RequestBody
	Map<String, Object> body) {
		String email = (String)body.getOrDefault("email", "");
		String password = (String)body.getOrDefault("password", "");
		if ("duplicate@test.com".equals(email)) {
			throw new BusinessException(EMAIL_DUPLICATE);
		}
		if ("unverified@test.com".equals(email)) {
			throw new BusinessException(EMAIL_NOT_VERIFIED);
		}
		if ("weak".equals(password)) {
			throw new BusinessException(INVALID_PASSWORD_FORMAT);
		}
		return ApiResponse.create("회원가입 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestBody
	Map<String, Object> body) {
		String password = (String)body.getOrDefault("password", "");
		if ("wrongpass".equals(password)) {
			throw new BusinessException(INVALID_CREDENTIALS);
		}
		return ApiResponse.ok("로그인 성공", buildLoginData());
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/token")
	public ResponseEntity<?> exchangeToken(@RequestBody
	Map<String, Object> body) {
		String code = (String)body.getOrDefault("code", "");
		if ("EXPIRED_CODE".equals(code)) {
			throw new BusinessException(INVALID_AUTH_CODE);
		}
		return ApiResponse.ok("로그인 성공", buildLoginData());
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/reissue")
	public ResponseEntity<?> reissueToken() {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("accessToken",
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIn0.reissued_mock");
		return ApiResponse.ok("토큰 재발급 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/logout")
	public ResponseEntity<?> logout() {
		return ApiResponse.ok("로그아웃 성공");
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PatchMapping("/password")
	public ResponseEntity<?> resetPassword(@RequestBody
	Map<String, Object> body) {
		String email = (String)body.getOrDefault("email", "");
		String newPassword = (String)body.getOrDefault("newPassword", "");
		if ("notfound@test.com".equals(email)) {
			throw new BusinessException(MEMBER_NOT_FOUND);
		}
		if ("oauth@test.com".equals(email)) {
			throw new BusinessException(OAUTH_ACCOUNT);
		}
		if ("weak".equals(newPassword)) {
			throw new BusinessException(INVALID_PASSWORD_FORMAT);
		}
		if ("samepass".equals(newPassword)) {
			throw new BusinessException(SAME_AS_CURRENT_PASSWORD);
		}
		return ApiResponse.ok("비밀번호 변경 성공");
	}

	private Map<String, Object> buildLoginData() {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("accessToken",
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIn0.mock_access_token");
		data.put("isFirstLogin", false);
		data.put("nickname", "dobby");
		data.put("onboardingStatus", "NONE");
		data.put("characterHair", "hair_01");
		data.put("characterHairColor", "color_black");
		data.put("characterBody", "body_default");
		data.put("characterEye", "eye_01");
		data.put("characterOutfit", "outfit_01");
		data.put("characterOutfitColor", "color_white");
		return data;
	}
}
