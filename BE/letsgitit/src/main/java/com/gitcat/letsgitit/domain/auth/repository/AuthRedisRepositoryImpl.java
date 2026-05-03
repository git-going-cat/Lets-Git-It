package com.gitcat.letsgitit.domain.auth.repository;

import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.auth.constants.AuthConstants;

@Repository
@Profile("!test")
public class AuthRedisRepositoryImpl implements AuthRedisRepository {

	private final StringRedisTemplate authStringRedisTemplate;

	public AuthRedisRepositoryImpl(
		@Qualifier("authStringRedisTemplate")
		StringRedisTemplate authStringRedisTemplate) {
		this.authStringRedisTemplate = authStringRedisTemplate;
	}

	// ===================== 키 생성 규칙 =====================

	// 예시: "auth:token:access:550e8400-..."
	private String accessTokenKey(String memberId) {
		return "auth:token:access:" + memberId;
	}

	// 예시: "auth:token:refresh:550e8400-..."
	private String refreshTokenKey(String memberId) {
		return "auth:token:refresh:" + memberId;
	}

	// 예시: "auth:blacklist:access:eyJhbGci..."
	private String accessBlacklistKey(String accessToken) {
		return "auth:blacklist:access:" + accessToken;
	}

	// 예시: "auth:blacklist:refresh:eyJhbGci..."
	private String refreshBlacklistKey(String refreshToken) {
		return "auth:blacklist:refresh:" + refreshToken;
	}

	// 예시: "auth:email:user@example.com:sign_up:code"
	private String emailCodeKey(String email, String purpose) {
		return "auth:email:" + email + ":" + purpose.toLowerCase() + ":code";
	}

	// 예시: "auth:email:user@example.com:sign_up:verified"
	private String emailVerifiedKey(String email, String purpose) {
		return "auth:email:" + email + ":" + purpose.toLowerCase() + ":verified";
	}

	// 예시: "auth:email:user@example.com:sign_up:send-count"
	private String emailSendCountKey(String email, String purpose) {
		return "auth:email:" + email + ":" + purpose.toLowerCase() + ":send-count";
	}

	// 예시: "auth:email:user@example.com:sign_up:cooldown"
	private String cooldownKey(String email, String purpose) {
		return "auth:email:" + email + ":" + purpose.toLowerCase() + ":cooldown";
	}

	// ===================== Access Token =====================

	// Access Token 저장 — 동시접속 차단용, TTL은 AT 만료 시간과 동일하게
	@Override
	public void saveAccessToken(String memberId, String accessToken) {
		authStringRedisTemplate.opsForValue()
			.set(accessTokenKey(memberId), accessToken,
				AuthConstants.ACCESS_TOKEN_TTL_MINUTES, TimeUnit.MINUTES);
	}

	// Access Token 조회
	@Override
	public String getAccessToken(String memberId) {
		return authStringRedisTemplate.opsForValue().get(accessTokenKey(memberId));
	}

	// Access Token 삭제 — 로그아웃 시 호출
	@Override
	public void deleteAccessToken(String memberId) {
		authStringRedisTemplate.delete(accessTokenKey(memberId));
	}

	// ===================== Refresh Token =====================

	// Refresh Token 저장
	@Override
	public void saveRefreshToken(String memberId, String refreshToken) {
		authStringRedisTemplate.opsForValue()
			.set(refreshTokenKey(memberId), refreshToken, 7, TimeUnit.DAYS);
	}

	// Refresh Token 조회
	@Override
	public String getRefreshToken(String memberId) {
		return authStringRedisTemplate.opsForValue().get(refreshTokenKey(memberId));
	}

	// Refresh Token 삭제 — 로그아웃 시 호출
	@Override
	public void deleteRefreshToken(String memberId) {
		authStringRedisTemplate.delete(refreshTokenKey(memberId));
	}

	// ===================== Access Token 블랙리스트 =====================

	// 무효화된 AT 등록 — 남은 만료 시간만큼 TTL 설정
	@Override
	public void addAccessTokenToBlacklist(String accessToken, long remainingMs) {
		authStringRedisTemplate.opsForValue()
			.set(accessBlacklistKey(accessToken), "revoked",
				remainingMs, TimeUnit.MILLISECONDS);
	}

	// AT 블랙리스트 확인 — hasKey null-safe 처리
	@Override
	public boolean isAccessTokenBlacklisted(String accessToken) {
		return Boolean.TRUE.equals(
			authStringRedisTemplate.hasKey(accessBlacklistKey(accessToken)));
	}

	// ===================== Refresh Token 블랙리스트 =====================

	// 무효화된 RT 등록
	@Override
	public void addRefreshTokenToBlacklist(String refreshToken, long remainingMs) {
		authStringRedisTemplate.opsForValue()
			.set(refreshBlacklistKey(refreshToken), "revoked",
				remainingMs, TimeUnit.MILLISECONDS);
	}

	// RT 블랙리스트 확인
	@Override
	public boolean isRefreshTokenBlacklisted(String refreshToken) {
		return Boolean.TRUE.equals(
			authStringRedisTemplate.hasKey(refreshBlacklistKey(refreshToken)));
	}

	// ===================== 이메일 인증 코드 =====================

	@Override
	public void saveEmailCode(String email, String purpose, String code) {
		authStringRedisTemplate.opsForValue()
			.set(emailCodeKey(email, purpose), code,
				AuthConstants.AUTH_CODE_TTL_MINUTES, TimeUnit.MINUTES);
	}

	@Override
	public String getEmailCode(String email, String purpose) {
		return authStringRedisTemplate.opsForValue().get(emailCodeKey(email, purpose));
	}

	@Override
	public void deleteEmailCode(String email, String purpose) {
		authStringRedisTemplate.delete(emailCodeKey(email, purpose));
	}

	// ===================== 이메일 인증 완료 상태 =====================

	@Override
	public void saveEmailVerified(String email, String purpose) {
		authStringRedisTemplate.opsForValue()
			.set(emailVerifiedKey(email, purpose), "true",
				AuthConstants.EMAIL_VERIFIED_TTL_MINUTES, TimeUnit.MINUTES);
	}

	@Override
	public boolean isEmailVerified(String email, String purpose) {
		return Boolean.TRUE.equals(
			authStringRedisTemplate.hasKey(emailVerifiedKey(email, purpose)));
	}

	@Override
	public void deleteEmailVerified(String email, String purpose) {
		authStringRedisTemplate.delete(emailVerifiedKey(email, purpose));
	}

	// ===================== 이메일 발송 횟수 =====================

	@Override
	public long incrementEmailSendCount(String email, String purpose) {
		String key = emailSendCountKey(email, purpose);
		Long count = authStringRedisTemplate.opsForValue().increment(key);

		// 최초 증가(count == 1)일 때만 TTL 설정
		if (count != null && count == 1) {
			authStringRedisTemplate.expire(key, 24, TimeUnit.HOURS);
		}

		return count != null ? count : 0L;
	}

	@Override
	public long getEmailSendCount(String email, String purpose) {
		String value = authStringRedisTemplate.opsForValue().get(emailSendCountKey(email, purpose));
		return value != null ? Long.parseLong(value) : 0L;
	}

	// ===================== 재발송 쿨다운 =====================

	@Override
	public void saveCooldown(String email, String purpose) {
		authStringRedisTemplate.opsForValue()
			.set(cooldownKey(email, purpose), "1",
				AuthConstants.EMAIL_RESEND_COOLDOWN_SECONDS, TimeUnit.SECONDS);
	}

	@Override
	public boolean hasCooldown(String email, String purpose) {
		return Boolean.TRUE.equals(
			authStringRedisTemplate.hasKey(cooldownKey(email, purpose)));
	}

	// 예시: "auth:oauth:tempcode:550e8400-e29b-41d4-a716-446655440000"
	private String oauthTempCodeKey(String code) {
		return "auth:oauth:tempcode:" + code;
	}

	@Override
	public void saveOAuthTempCode(String code, String email) {
		authStringRedisTemplate.opsForValue()
			.set(oauthTempCodeKey(code), email,
				AuthConstants.OAUTH_TEMP_CODE_TTL_SECONDS, TimeUnit.SECONDS);
	}

	// Redis GETDEL — GET과 DEL을 단일 명령으로 원자 처리
	// 동일 코드로 동시 요청이 들어와도 하나만 email을 획득하고 나머지는 null 반환
	@Override
	public String consumeOAuthTempCode(String code) {
		return authStringRedisTemplate.opsForValue().getAndDelete(oauthTempCodeKey(code));
	}

	@Override
	public String getOAuthTempCode(String code) {
		return authStringRedisTemplate.opsForValue().get(oauthTempCodeKey(code));
	}

	@Override
	public void deleteOAuthTempCode(String code) {
		authStringRedisTemplate.delete(oauthTempCodeKey(code));
	}
}
