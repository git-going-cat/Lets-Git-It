package com.gitcat.letsgitit.domain.auth.repository;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.*;

import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.gitcat.letsgitit.domain.auth.constants.AuthConstants;

@ExtendWith(MockitoExtension.class)
class AuthRedisRepositoryImplTest {

	private AuthRedisRepositoryImpl authRedisRepository;

	@Mock
	private StringRedisTemplate authStringRedisTemplate;

	@Mock
	private ValueOperations<String, String> valueOps;

	private static final String EMAIL = "test@example.com";
	private static final String CODE = "ABC123";
	private static final String PURPOSE = "sign_up";
	private static final String MEMBER_ID = "550e8400-e29b-41d4-a716-446655440000";
	private static final String ACCESS_TOKEN = "access.token.value";
	private static final String REFRESH_TOKEN = "refresh.token.value";

	@BeforeEach
	void setUp() {
		// StringRedisTemplate의 opsForValue()는 테스트마다 설정 필요
		authRedisRepository = new AuthRedisRepositoryImpl(authStringRedisTemplate);
	}

	// ===================== 이메일 인증 코드 =====================

	@Test
	void 이메일_코드_저장_및_조회() {
		// given
		given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);
		given(valueOps.get("auth:email:" + EMAIL + ":" + PURPOSE + ":code")).willReturn(CODE);

		// when
		authRedisRepository.saveEmailCode(EMAIL, PURPOSE, CODE);
		String result = authRedisRepository.getEmailCode(EMAIL, PURPOSE);

		// then
		assertThat(result).isEqualTo(CODE);
		then(valueOps).should().set(
			eq("auth:email:" + EMAIL + ":" + PURPOSE + ":code"),
			eq(CODE),
			eq(AuthConstants.AUTH_CODE_TTL_MINUTES),
			eq(TimeUnit.MINUTES));
	}

	@Test
	void 이메일_코드_삭제() {
		// when
		authRedisRepository.deleteEmailCode(EMAIL, PURPOSE);

		// then
		then(authStringRedisTemplate).should().delete("auth:email:" + EMAIL + ":" + PURPOSE + ":code");
	}

	// ===================== 이메일 인증 완료 상태 =====================

	@Test
	void 인증_완료_상태_저장_및_조회() {
		// given
		given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);
		given(authStringRedisTemplate.hasKey("auth:email:" + EMAIL + ":" + PURPOSE + ":verified")).willReturn(true);

		// when
		authRedisRepository.saveEmailVerified(EMAIL, PURPOSE);
		boolean verified = authRedisRepository.isEmailVerified(EMAIL, PURPOSE);

		// then
		assertThat(verified).isTrue();
		then(valueOps).should().set(
			eq("auth:email:" + EMAIL + ":" + PURPOSE + ":verified"),
			eq("true"),
			eq(AuthConstants.EMAIL_VERIFIED_TTL_MINUTES),
			eq(TimeUnit.MINUTES));
	}

	@Test
	void 인증_완료_상태_없을_때_false_반환() {
		// given
		given(authStringRedisTemplate.hasKey("auth:email:" + EMAIL + ":" + PURPOSE + ":verified")).willReturn(false);

		// when
		boolean verified = authRedisRepository.isEmailVerified(EMAIL, PURPOSE);

		// then
		assertThat(verified).isFalse();
	}

	@Test
	void 인증_완료_상태_삭제() {
		// when
		authRedisRepository.deleteEmailVerified(EMAIL, PURPOSE);

		// then
		then(authStringRedisTemplate).should().delete("auth:email:" + EMAIL + ":" + PURPOSE + ":verified");
	}

	// ===================== 이메일 발송 횟수 =====================

	@Test
	void 발송_횟수_최초_증가_시_TTL_설정() {
		// given
		String key = "auth:email:" + EMAIL + ":" + PURPOSE + ":send-count";
		given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);
		given(valueOps.increment(key)).willReturn(1L);

		// when
		long count = authRedisRepository.incrementEmailSendCount(EMAIL, PURPOSE);

		// then
		assertThat(count).isEqualTo(1L);
		then(authStringRedisTemplate).should().expire(key, 24, TimeUnit.HOURS);
	}

	@Test
	void 발송_횟수_두번째_증가_시_TTL_미설정() {
		// given
		String key = "auth:email:" + EMAIL + ":" + PURPOSE + ":send-count";
		given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);
		given(valueOps.increment(key)).willReturn(2L);

		// when
		authRedisRepository.incrementEmailSendCount(EMAIL, PURPOSE);

		// then
		then(authStringRedisTemplate).should(never()).expire(anyString(), anyLong(), any());
	}

	// ===================== 재발송 쿨다운 =====================

	@Test
	void 쿨다운_저장_및_조회() {
		// given
		given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);
		given(authStringRedisTemplate.hasKey("auth:email:" + EMAIL + ":" + PURPOSE + ":cooldown")).willReturn(true);

		// when
		authRedisRepository.saveCooldown(EMAIL, PURPOSE);
		boolean hasCooldown = authRedisRepository.hasCooldown(EMAIL, PURPOSE);

		// then
		assertThat(hasCooldown).isTrue();
		then(valueOps).should().set(
			eq("auth:email:" + EMAIL + ":" + PURPOSE + ":cooldown"),
			eq("1"),
			eq(AuthConstants.EMAIL_RESEND_COOLDOWN_SECONDS),
			eq(TimeUnit.SECONDS));
	}

	@Test
	void 쿨다운_없을_때_false_반환() {
		// given
		given(authStringRedisTemplate.hasKey("auth:email:" + EMAIL + ":" + PURPOSE + ":cooldown")).willReturn(false);

		// when
		boolean hasCooldown = authRedisRepository.hasCooldown(EMAIL, PURPOSE);

		// then
		assertThat(hasCooldown).isFalse();
	}

	// ===================== Access Token =====================

	@Test
	void AT_저장_및_조회() {
		// given
		given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);
		given(valueOps.get("auth:token:access:" + MEMBER_ID)).willReturn(ACCESS_TOKEN);

		// when
		authRedisRepository.saveAccessToken(MEMBER_ID, ACCESS_TOKEN);
		String result = authRedisRepository.getAccessToken(MEMBER_ID);

		// then
		assertThat(result).isEqualTo(ACCESS_TOKEN);
		then(valueOps).should().set(
			eq("auth:token:access:" + MEMBER_ID),
			eq(ACCESS_TOKEN),
			eq(AuthConstants.ACCESS_TOKEN_TTL_MINUTES),
			eq(TimeUnit.MINUTES));
	}

	@Test
	void AT_삭제() {
		// when
		authRedisRepository.deleteAccessToken(MEMBER_ID);

		// then
		then(authStringRedisTemplate).should().delete("auth:token:access:" + MEMBER_ID);
	}

	// ===================== Refresh Token =====================

	@Test
	void RT_저장_및_조회() {
		// given
		given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);
		given(valueOps.get("auth:token:refresh:" + MEMBER_ID)).willReturn(REFRESH_TOKEN);

		// when
		authRedisRepository.saveRefreshToken(MEMBER_ID, REFRESH_TOKEN);
		String result = authRedisRepository.getRefreshToken(MEMBER_ID);

		// then
		assertThat(result).isEqualTo(REFRESH_TOKEN);
	}

	@Test
	void RT_삭제() {
		// when
		authRedisRepository.deleteRefreshToken(MEMBER_ID);

		// then
		then(authStringRedisTemplate).should().delete("auth:token:refresh:" + MEMBER_ID);
	}

	// ===================== Access Token 블랙리스트 =====================

	@Test
	void AT_블랙리스트_등록_및_조회() {
		// given
		long remainingMs = 10000L;
		given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);
		given(authStringRedisTemplate.hasKey("auth:blacklist:access:" + ACCESS_TOKEN)).willReturn(true);

		// when
		authRedisRepository.addAccessTokenToBlacklist(ACCESS_TOKEN, remainingMs);
		boolean blacklisted = authRedisRepository.isAccessTokenBlacklisted(ACCESS_TOKEN);

		// then
		assertThat(blacklisted).isTrue();
		then(valueOps).should().set(
			eq("auth:blacklist:access:" + ACCESS_TOKEN),
			eq("revoked"),
			eq(remainingMs),
			eq(TimeUnit.MILLISECONDS));
	}

	@Test
	void AT_블랙리스트_미등록_시_false_반환() {
		// given
		given(authStringRedisTemplate.hasKey("auth:blacklist:access:" + ACCESS_TOKEN)).willReturn(false);

		// when
		boolean blacklisted = authRedisRepository.isAccessTokenBlacklisted(ACCESS_TOKEN);

		// then
		assertThat(blacklisted).isFalse();
	}

	// ===================== Refresh Token 블랙리스트 =====================

	@Test
	void RT_블랙리스트_등록_및_조회() {
		// given
		long remainingMs = 100000L;
		given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);
		given(authStringRedisTemplate.hasKey("auth:blacklist:refresh:" + REFRESH_TOKEN)).willReturn(true);

		// when
		authRedisRepository.addRefreshTokenToBlacklist(REFRESH_TOKEN, remainingMs);
		boolean blacklisted = authRedisRepository.isRefreshTokenBlacklisted(REFRESH_TOKEN);

		// then
		assertThat(blacklisted).isTrue();
		then(valueOps).should().set(
			eq("auth:blacklist:refresh:" + REFRESH_TOKEN),
			eq("revoked"),
			eq(remainingMs),
			eq(TimeUnit.MILLISECONDS));
	}

	@Test
	void RT_블랙리스트_미등록_시_false_반환() {
		// given
		given(authStringRedisTemplate.hasKey("auth:blacklist:refresh:" + REFRESH_TOKEN)).willReturn(false);

		// when
		boolean blacklisted = authRedisRepository.isRefreshTokenBlacklisted(REFRESH_TOKEN);

		// then
		assertThat(blacklisted).isFalse();
	}
}
