package com.gitcat.letsgitit.global.websocket.auth;

import org.springframework.stereotype.Component;

import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.repository.MemberRepository;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.jwt.JwtProvider;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class WebSocketPrincipalResolver {

	private final JwtProvider jwtProvider;
	private final AuthRedisRepository authRedisRepository;
	private final MemberRepository memberRepository;

	public StompPrincipal resolve(String token) {
		try {
			if (!jwtProvider.validateToken(token)) {
				throw new BusinessException(ErrorCode.INVALID_TOKEN);
			}

			String tokenType = jwtProvider.getTokenType(token);

			// Refresh Token 차단
			if (!"access".equals(tokenType)) {
				throw new BusinessException(ErrorCode.INVALID_TOKEN);
			}

			// 블랙 리스트 토큰 차단
			if (authRedisRepository.isAccessTokenBlacklisted(token)) {
				throw new BusinessException(ErrorCode.TOKEN_BLACKLISTED);
			}

			String email = jwtProvider.getEmail(token);

			Member member = memberRepository.findByEmail(email)
				.orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

			// Redis 저장 토큰 일치 여부 검증
			String storedAccessToken = authRedisRepository.getAccessToken(member.getId().toString());

			if (!token.equals(storedAccessToken)) {
				throw new BusinessException(ErrorCode.INVALID_TOKEN);
			}

			return new StompPrincipal(member.getId().toString());
		} catch (ExpiredJwtException e) {
			throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
		} catch (JwtException | IllegalArgumentException e) {
			throw new BusinessException(ErrorCode.INVALID_TOKEN);
		}
	}
}
