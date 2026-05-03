package com.gitcat.letsgitit.global.jwt;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import io.jsonwebtoken.ExpiredJwtException;

class JwtProviderTest {

	private JwtProvider jwtProvider;

	private static final String SECRET = "test-secret-key-must-be-at-least-256-bits-long-for-hs256-algorithm";
	private static final long ACCESS_EXPIRATION = 1800000L;
	private static final long REFRESH_EXPIRATION = 604800000L;
	private static final String EMAIL = "test@example.com";

	@BeforeEach
	void setUp() {
		jwtProvider = new JwtProvider();
		ReflectionTestUtils.setField(jwtProvider, "secretString", SECRET);
		ReflectionTestUtils.setField(jwtProvider, "accessExpiration", ACCESS_EXPIRATION);
		ReflectionTestUtils.setField(jwtProvider, "refreshExpiration", REFRESH_EXPIRATION);
		jwtProvider.init();
	}

	@Test
	void Access_Token_생성_및_파싱() {
		// when
		String token = jwtProvider.createAccessToken(EMAIL);

		// then
		assertThat(token).isNotBlank();
		assertThat(jwtProvider.getEmail(token)).isEqualTo(EMAIL);
		assertThat(jwtProvider.validateToken(token)).isTrue();
	}

	@Test
	void Refresh_Token_생성_및_파싱() {
		// when
		String token = jwtProvider.createRefreshToken(EMAIL);

		// then
		assertThat(token).isNotBlank();
		assertThat(jwtProvider.getEmail(token)).isEqualTo(EMAIL);
		assertThat(jwtProvider.validateToken(token)).isTrue();
	}

	@Test
	void 만료된_토큰_검증_시_ExpiredJwtException() {
		// given
		String expiredToken = 만료_토큰_생성();

		// when & then
		assertThrows(ExpiredJwtException.class, () -> jwtProvider.validateToken(expiredToken));
	}

	@Test
	void 잘못된_토큰_검증_시_false_반환() {
		// when
		boolean result = jwtProvider.validateToken("invalid.token.string");

		// then
		assertThat(result).isFalse();
	}

	@Test
	void 잘못된_서명_토큰_검증_시_false_반환() {
		// given: 다른 키로 서명된 토큰 생성
		JwtProvider otherProvider = new JwtProvider();
		ReflectionTestUtils.setField(otherProvider, "secretString",
			"other-secret-key-must-be-at-least-256-bits-long-for-hs256-algorithm");
		ReflectionTestUtils.setField(otherProvider, "accessExpiration", ACCESS_EXPIRATION);
		ReflectionTestUtils.setField(otherProvider, "refreshExpiration", REFRESH_EXPIRATION);
		otherProvider.init();
		String wrongSignatureToken = otherProvider.createAccessToken(EMAIL);

		// when
		boolean result = jwtProvider.validateToken(wrongSignatureToken);

		// then
		assertThat(result).isFalse();
	}

	@Test
	void getExpiration_유효한_토큰_양수_반환() {
		// given
		String token = jwtProvider.createAccessToken(EMAIL);

		// when
		long remaining = jwtProvider.getExpiration(token);

		// then
		assertThat(remaining).isGreaterThan(0L);
		assertThat(remaining).isLessThanOrEqualTo(ACCESS_EXPIRATION);
	}

	@Test
	void getExpiration_만료된_토큰_시_음수_반환() {
		// given
		String expiredToken = 만료_토큰_생성();

		// when
		long remaining = jwtProvider.getExpiration(expiredToken);

		// then
		assertThat(remaining).isNegative();
	}

	private String 만료_토큰_생성() {
		JwtProvider shortLived = new JwtProvider();
		ReflectionTestUtils.setField(shortLived, "secretString", SECRET);
		ReflectionTestUtils.setField(shortLived, "accessExpiration", -1L);
		ReflectionTestUtils.setField(shortLived, "refreshExpiration", -1L);
		shortLived.init();
		return shortLived.createAccessToken(EMAIL);
	}
}
