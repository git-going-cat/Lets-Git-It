package com.gitcat.letsgitit.global.websocket.auth;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.repository.MemberRepository;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.jwt.JwtProvider;

import io.jsonwebtoken.ExpiredJwtException;

@ExtendWith(MockitoExtension.class)
class WebSocketPrincipalResolverTest {

	private static final String TOKEN = "access.token";
	private static final String EMAIL = "test@example.com";

	@InjectMocks
	private WebSocketPrincipalResolver resolver;

	@Mock
	private JwtProvider jwtProvider;

	@Mock
	private AuthRedisRepository authRedisRepository;

	@Mock
	private MemberRepository memberRepository;

	@Test
	void 유효한_토큰이면_memberId_기반_StompPrincipal을_반환한다() {
		UUID memberId = UUID.randomUUID();
		Member member = Member.of(EMAIL, "encoded-password");
		ReflectionTestUtils.setField(member, "id", memberId);

		given(jwtProvider.validateToken(TOKEN)).willReturn(true);
		given(jwtProvider.getTokenType(TOKEN)).willReturn("access");
		given(authRedisRepository.isAccessTokenBlacklisted(TOKEN)).willReturn(false);
		given(jwtProvider.getEmail(TOKEN)).willReturn(EMAIL);
		given(memberRepository.findByEmail(EMAIL)).willReturn(Optional.of(member));
		given(authRedisRepository.getAccessToken(memberId.toString())).willReturn(TOKEN);

		StompPrincipal principal = resolver.resolve(TOKEN);

		assertThat(principal.getName()).isEqualTo(memberId.toString());
	}

	@Test
	void 만료된_토큰이면_TOKEN_EXPIRED를_반환한다() {
		given(jwtProvider.validateToken(TOKEN)).willThrow(mock(ExpiredJwtException.class));

		BusinessException exception = catchThrowableOfType(
			() -> resolver.resolve(TOKEN),
			BusinessException.class);

		assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TOKEN_EXPIRED);
	}

	@Test
	void 유효하지_않은_토큰이면_INVALID_TOKEN을_반환한다() {
		given(jwtProvider.validateToken(TOKEN)).willReturn(false);

		BusinessException exception = catchThrowableOfType(
			() -> resolver.resolve(TOKEN),
			BusinessException.class);

		assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.INVALID_TOKEN);
	}

	@Test
	void 토큰은_유효하지만_회원이_없으면_MEMBER_NOT_FOUND를_반환한다() {
		given(jwtProvider.validateToken(TOKEN)).willReturn(true);
		given(jwtProvider.getTokenType(TOKEN)).willReturn("access");
		given(authRedisRepository.isAccessTokenBlacklisted(TOKEN)).willReturn(false);
		given(jwtProvider.getEmail(TOKEN)).willReturn(EMAIL);
		given(memberRepository.findByEmail(EMAIL)).willReturn(Optional.empty());

		BusinessException exception = catchThrowableOfType(
			() -> resolver.resolve(TOKEN),
			BusinessException.class);

		assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
	}

	@Test
	void refresh_token이면_INVALID_TOKEN을_반환한다() {
		given(jwtProvider.validateToken(TOKEN)).willReturn(true);
		given(jwtProvider.getTokenType(TOKEN)).willReturn("refresh");

		BusinessException exception = catchThrowableOfType(
			() -> resolver.resolve(TOKEN),
			BusinessException.class);

		assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.INVALID_TOKEN);
	}

	@Test
	void 블랙리스트_access_token이면_TOKEN_BLACKLISTED를_반환한다() {
		given(jwtProvider.validateToken(TOKEN)).willReturn(true);
		given(jwtProvider.getTokenType(TOKEN)).willReturn("access");
		given(authRedisRepository.isAccessTokenBlacklisted(TOKEN)).willReturn(true);

		BusinessException exception = catchThrowableOfType(
			() -> resolver.resolve(TOKEN),
			BusinessException.class);

		assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TOKEN_BLACKLISTED);
	}

	@Test
	void Redis에_저장된_access_token과_다르면_INVALID_TOKEN을_반환한다() {
		UUID memberId = UUID.randomUUID();
		Member member = Member.of(EMAIL, "encoded-password");
		ReflectionTestUtils.setField(member, "id", memberId);

		given(jwtProvider.validateToken(TOKEN)).willReturn(true);
		given(jwtProvider.getTokenType(TOKEN)).willReturn("access");
		given(authRedisRepository.isAccessTokenBlacklisted(TOKEN)).willReturn(false);
		given(jwtProvider.getEmail(TOKEN)).willReturn(EMAIL);
		given(memberRepository.findByEmail(EMAIL)).willReturn(Optional.of(member));
		given(authRedisRepository.getAccessToken(memberId.toString())).willReturn("other.token");

		BusinessException exception = catchThrowableOfType(
			() -> resolver.resolve(TOKEN),
			BusinessException.class);

		assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.INVALID_TOKEN);
	}
}
