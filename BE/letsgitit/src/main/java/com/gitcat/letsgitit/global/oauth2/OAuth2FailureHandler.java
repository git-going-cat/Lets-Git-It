package com.gitcat.letsgitit.global.oauth2;

import java.io.IOException;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import com.gitcat.letsgitit.domain.auth.constants.AuthConstants;
import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.jwt.JwtProvider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

	private final AuthRedisRepository authRedisRepository;
	private final JwtProvider jwtProvider;
	private final MemberService memberService;

	@Value("${oauth2.frontend-redirect-uri}")
	private String frontendRedirectUri;

	@Override
	public void onAuthenticationFailure(
		HttpServletRequest request,
		HttpServletResponse response,
		AuthenticationException exception) throws IOException {

		// Redis 정리 성공 여부와 무관하게 쿠키는 항상 만료
		invalidateRedisSession(request);
		expireRefreshTokenCookie(response);

		String redirectUrl = UriComponentsBuilder.fromUriString(frontendRedirectUri)
			.queryParam("error", "oauth_failed")
			.build().toUriString();

		log.error("[auth][OAuth2FailureHandler] login failed. reason={}", exception.getMessage());
		response.sendRedirect(redirectUrl);
	}

	private void invalidateRedisSession(HttpServletRequest request) {
		String refreshToken = extractRefreshTokenFromCookie(request);
		if (refreshToken == null) {
			return;
		}

		try {
			if (!jwtProvider.validateToken(refreshToken)) {
				return;
			}

			String email = jwtProvider.getEmail(refreshToken);
			Member member = memberService.findByEmail(email);
			String memberId = member.getId().toString();

			String storedAccessToken = authRedisRepository.getAccessToken(memberId);
			if (storedAccessToken != null) {
				long remainingMs = jwtProvider.getExpiration(storedAccessToken);
				if (remainingMs > 0) {
					authRedisRepository.addAccessTokenToBlacklist(storedAccessToken, remainingMs);
				}
				authRedisRepository.deleteAccessToken(memberId);
			}

			long refreshRemainingMs = jwtProvider.getExpiration(refreshToken);
			if (refreshRemainingMs > 0) {
				authRedisRepository.addRefreshTokenToBlacklist(refreshToken, refreshRemainingMs);
			}
			authRedisRepository.deleteRefreshToken(memberId);

		} catch (BusinessException e) {
			log.debug(
				"[auth][OAuth2FailureHandler] member lookup failed during Redis cleanup (new user or expired session).");
		} catch (Exception e) {
			log.warn("[auth][OAuth2FailureHandler] exception during Redis cleanup.", e);
		}
	}

	private void expireRefreshTokenCookie(HttpServletResponse response) {
		ResponseCookie expiredCookie = ResponseCookie.from(AuthConstants.REFRESH_TOKEN_COOKIE, "")
			.httpOnly(true)
			.secure(true)
			.path("/")
			.maxAge(0)
			.sameSite("None")
			.build();
		response.addHeader(HttpHeaders.SET_COOKIE, expiredCookie.toString());
	}

	private String extractRefreshTokenFromCookie(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		for (Cookie cookie : cookies) {
			if (AuthConstants.REFRESH_TOKEN_COOKIE.equals(cookie.getName())) {
				return cookie.getValue();
			}
		}
		return null;
	}
}
