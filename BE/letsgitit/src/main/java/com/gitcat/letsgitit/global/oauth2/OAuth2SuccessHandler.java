package com.gitcat.letsgitit.global.oauth2;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

	private final AuthRedisRepository authRedisRepository;

	@Value("${oauth2.frontend-redirect-uri}")
	private String frontendRedirectUri;

	@Override
	public void onAuthenticationSuccess(
		HttpServletRequest request,
		HttpServletResponse response,
		Authentication authentication) throws IOException {

		OAuth2User oAuth2User = (OAuth2User)authentication.getPrincipal();
		Map<String, Object> attributes = oAuth2User.getAttributes();
		String memberId = (String)attributes.get("memberId");
		boolean isReactivated = Boolean.TRUE.equals(attributes.get("isReactivated")); // 추가

		// 1. UUID 임시코드 발급
		String tempCode = UUID.randomUUID().toString();

		// 2. Redis에 저장 (key: UUID, value: memberId, TTL: 30초)
		authRedisRepository.saveOAuthTempCode(tempCode, memberId);
		authRedisRepository.saveOAuthReactivated(tempCode, isReactivated); // 추가

		// 3. 프론트로 리다이렉트 (임시코드 쿼리파라미터로 전달)
		String redirectUrl = UriComponentsBuilder.fromUriString(frontendRedirectUri)
			.queryParam("code", tempCode)
			.build().toUriString();

		log.debug("OAuth2 로그인 성공, 임시코드 발급. memberId: {}", memberId);
		response.sendRedirect(redirectUrl);
	}
}
