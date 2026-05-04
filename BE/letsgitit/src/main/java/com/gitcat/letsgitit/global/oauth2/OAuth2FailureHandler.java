package com.gitcat.letsgitit.global.oauth2;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class OAuth2FailureHandler implements AuthenticationFailureHandler {

	@Value("${oauth2.frontend-redirect-uri}")
	private String frontendRedirectUri;

	@Override
	public void onAuthenticationFailure(
		HttpServletRequest request,
		HttpServletResponse response,
		AuthenticationException exception) throws IOException {

		// 프론트의 동일 콜백 페이지로 리다이렉트, error 파라미터로 실패 알림
		String redirectUrl = UriComponentsBuilder.fromUriString(frontendRedirectUri)
			.queryParam("error", "oauth_failed")
			.build().toUriString();

		log.error("OAuth2 로그인 실패: {}", exception.getMessage());
		response.sendRedirect(redirectUrl);
	}
}
