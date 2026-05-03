package com.gitcat.letsgitit.domain.auth.repository;

public interface AuthRedisRepository {

	// ===================== Access Token =====================

	// Access Token 저장 (TTL: 30분) — 동시접속 차단용
	void saveAccessToken(String memberId, String accessToken);

	// Access Token 조회 — 없으면 null 반환
	String getAccessToken(String memberId);

	// Access Token 삭제 - 로그아웃 시 호출
	void deleteAccessToken(String memberId);

	// ===================== Refresh Token =====================

	// Refresh Token 저장 (TTL: 7일)
	void saveRefreshToken(String memberId, String refreshToken);

	// Refresh Token 조회 — 없으면 null 반환
	String getRefreshToken(String memberId);

	// Refresh Token 삭제 — 로그아웃 시 호출
	void deleteRefreshToken(String memberId);

	// ===================== Access Token 블랙리스트 =====================

	// 무효화된 Access Token 등록 (TTL: 30분)
	void addAccessTokenToBlacklist(String accessToken, long remainingMs);

	// Access Token 블랙리스트 등록 여부 확인
	boolean isAccessTokenBlacklisted(String accessToken);

	// ===================== Refresh Token 블랙리스트 =====================

	// 무효화된 Refresh Token 등록 (TTL: 7일)
	void addRefreshTokenToBlacklist(String refreshToken, long remainingMs);

	// Refresh Token 블랙리스트 등록 여부 확인
	boolean isRefreshTokenBlacklisted(String refreshToken);

	// ===================== 이메일 인증 코드 =====================

	// 인증 코드 저장 (TTL: 5분)
	void saveEmailCode(String email, String purpose, String code);

	// 인증 코드 조회 — Redis에 없으면 null 반환 (만료 또는 미발송)
	String getEmailCode(String email, String purpose);

	// 인증 코드 삭제 — 검증 성공 후 재사용 방지를 위해 즉시 삭제
	void deleteEmailCode(String email, String purpose);

	// ===================== 이메일 인증 완료 상태 =====================

	// 인증 완료 상태 저장 (TTL: 10분)
	void saveEmailVerified(String email, String purpose);

	// 인증 완료 여부 확인 — 키 존재 여부로 판단
	boolean isEmailVerified(String email, String purpose);

	// 인증 완료 상태 삭제 — 회원가입/비밀번호 변경 완료 후 삭제
	void deleteEmailVerified(String email, String purpose);

	// ===================== 이메일 발송 횟수 =====================

	// 발송 횟수 증가 후 현재 값 반환 (TTL: 24시간) — 최대 3회 제한
	long incrementEmailSendCount(String email, String purpose);

	// 현재 발송 횟수 조회 — 키 없으면 0 반환
	long getEmailSendCount(String email, String purpose);

	// ===================== 재발송 쿨다운 =====================

	// 재발송 쿨다운 등록 (TTL: 30초)
	void saveCooldown(String email, String purpose);

	// 쿨다운 존재 여부 확인
	boolean hasCooldown(String email, String purpose);
}
