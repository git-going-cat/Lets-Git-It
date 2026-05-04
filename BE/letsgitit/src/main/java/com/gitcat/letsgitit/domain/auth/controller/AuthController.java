package com.gitcat.letsgitit.domain.auth.controller;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.domain.auth.constants.AuthConstants;
import com.gitcat.letsgitit.domain.auth.dto.request.AuthRequest;
import com.gitcat.letsgitit.domain.auth.dto.response.AuthResponse;
import com.gitcat.letsgitit.domain.auth.service.AuthService;
import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.global.enums.AuthPurpose;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController implements AuthControllerDocs {

	private final AuthService authService;

	@Override
	@PostMapping("/email/send")
	public ResponseEntity<?> sendEmailCode(
		@RequestParam
		AuthPurpose purpose, // String → Enum 자동 변환, 잘못된 값이면 400
		@Valid @RequestBody
		AuthRequest.SendEmailCodeRequest request) {
		AuthResponse.SendEmailCodeResponse response = authService.sendEmailCode(request.email(), purpose);
		return ApiResponse.ok("인증 메일 발송 성공", response);
	}

	@Override
	@PostMapping("/email/verify")
	public ResponseEntity<?> verifyEmailCode(
		@RequestParam
		AuthPurpose purpose,
		@Valid @RequestBody
		AuthRequest.VerifyEmailCodeRequest request) {
		authService.verifyEmailCode(request, purpose);
		return ApiResponse.ok("이메일 인증 성공");
	}

	@Override
	@PostMapping("/register")
	public ResponseEntity<?> register(
		@Valid @RequestBody
		AuthRequest.RegisterRequest request) {
		authService.register(request);
		return ApiResponse.create("회원가입 성공");
	}

	@Override
	@PostMapping("/login")
	public ResponseEntity<?> login(
		@Valid @RequestBody
		AuthRequest.LoginRequest request,
		HttpServletResponse response) {

		AuthResponse.LoginResponse loginResponse = authService.login(request, response);
		return ApiResponse.ok("로그인 성공", loginResponse);
	}

	@Override
	@PostMapping("/token")
	public ResponseEntity<?> exchangeToken(
		@RequestBody
		Map<String, String> body,
		HttpServletResponse response) {

		String code = body.get("code");
		if (code == null || code.isBlank()) {
			throw new BusinessException(ErrorCode.INVALID_AUTH_CODE);
		}

		AuthResponse.LoginResponse loginResponse = authService.loginWithOAuth(code, response);
		return ApiResponse.ok("로그인 성공", loginResponse);
	}

	@Override
	@PostMapping("/reissue")
	public ResponseEntity<?> reissueToken(
		@CookieValue(name = AuthConstants.REFRESH_TOKEN_COOKIE, required = false)
		String refreshToken,
		HttpServletResponse response) {

		// 쿠키 누락 체크
		if (refreshToken == null) {
			throw new BusinessException(ErrorCode.MISSING_COOKIE);
		}

		AuthResponse.ReissueResponse reissueResponse = authService.reissue(refreshToken, response);
		return ApiResponse.ok("토큰 재발급 성공", reissueResponse);
	}

	@Override
	@PostMapping("/logout")
	public ResponseEntity<?> logout(
		HttpServletRequest request,
		HttpServletResponse response) {

		// Authorization 헤더에서 AT 추출
		String bearerToken = request.getHeader("Authorization");
		if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
			throw new BusinessException(ErrorCode.INVALID_TOKEN);
		}

		String accessToken = bearerToken.substring(7);
		authService.logout(accessToken, response);
		return ApiResponse.ok("로그아웃 성공");
	}

	@Override
	@PatchMapping("/password/reset")
	public ResponseEntity<?> resetPassword(
		@Valid @RequestBody
		AuthRequest.ResetPasswordRequest request) {

		authService.resetPassword(request);
		return ApiResponse.ok("비밀번호 변경 성공");
	}

	@Override
	@PostMapping("/password/verify")
	public ResponseEntity<?> verifyPassword(
		@Valid @RequestBody
		AuthRequest.VerifyPasswordRequest request,
		@AuthenticationPrincipal
		CustomUserDetails userDetails) { // UserDetails → CustomUserDetails

		authService.verifyPassword(request, userDetails.getUsername());
		return ApiResponse.ok("비밀번호 검증 성공");
	}
}
