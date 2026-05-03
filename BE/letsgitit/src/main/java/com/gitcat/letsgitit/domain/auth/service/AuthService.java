package com.gitcat.letsgitit.domain.auth.service;

import jakarta.servlet.http.HttpServletResponse;

import com.gitcat.letsgitit.domain.auth.dto.request.AuthRequest;
import com.gitcat.letsgitit.domain.auth.dto.response.AuthResponse;
import com.gitcat.letsgitit.global.enums.AuthPurpose;

public interface AuthService {

	// 이메일 인증 코드 발송
	AuthResponse.SendEmailCodeResponse sendEmailCode(String email, AuthPurpose purpose);

	// 이메일 인증 코드 검증
	void verifyEmailCode(AuthRequest.VerifyEmailCodeRequest request, AuthPurpose purpose);

	// 회원가입
	void register(AuthRequest.RegisterRequest request);

	// 로컬 로그인
	AuthResponse.LoginResponse login(AuthRequest.LoginRequest request, HttpServletResponse response);

	// OAuth 임시코드 → Access Token 교환 (구글 소셜 로그인)
	AuthResponse.LoginResponse loginWithOAuth(String tempCode, HttpServletResponse response);

	// 토큰 재발급
	AuthResponse.ReissueResponse reissue(String refreshToken, HttpServletResponse response);

	// 로그아웃
	void logout(String accessToken, HttpServletResponse response);

	// 비밀번호 변경 (비밀번호 찾기용, 인증 불필요)
	void resetPassword(AuthRequest.ResetPasswordRequest request);

	// 비밀번호 검증 (인증 필요)
	void verifyPassword(AuthRequest.VerifyPasswordRequest request, String email);
}
