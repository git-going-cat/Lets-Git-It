package com.gitcat.letsgitit.domain.auth.constants;

public class AuthConstants {

	private AuthConstants() {} // 인스턴스 생성 방지

	// 인증 코드 자릿수
	public static final int AUTH_CODE_LENGTH = 6;

	// 인증 코드 만료 시간 (분)
	public static final long AUTH_CODE_TTL_MINUTES = 5;

	// 이메일 인증 완료 상태 유지 시간 (분)
	// 회원가입/비밀번호 변경 완료 전까지 유지
	public static final long EMAIL_VERIFIED_TTL_MINUTES = 10;

	// 목적별 이메일 발송 최대 횟수
	public static final long MAX_EMAIL_SEND_COUNT = 3;

	// 재발송 제한 시간 (초) — 30초 이내 재요청 차단
	public static final long EMAIL_RESEND_COOLDOWN_SECONDS = 30;

	// 인증 코드 문자셋 — O/0, I/1 혼동 방지를 위해 제외
	public static final String AUTH_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

	// Refresh Token 쿠키 이름
	public static final String REFRESH_TOKEN_COOKIE = "refreshToken";

	// Access Token Redis 저장 TTL (분) — application.yml의 access-expiration과 맞춰야 함
	public static final long ACCESS_TOKEN_TTL_MINUTES = 30;

	// OAuth 임시코드 TTL: 30초
	public static final long OAUTH_TEMP_CODE_TTL_SECONDS = 30L;
}
