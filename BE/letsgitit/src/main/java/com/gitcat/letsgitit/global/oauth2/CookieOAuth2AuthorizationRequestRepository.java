package com.gitcat.letsgitit.global.oauth2;

import java.util.Base64;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.SerializationUtils;

@Component
public class CookieOAuth2AuthorizationRequestRepository
	implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

	private static final String COOKIE_NAME = "oauth2_auth_request";
	private static final int COOKIE_EXPIRE_SECONDS = 180;

	@Value("${oauth2.cookie.secure}")
	private boolean secureCookie;

	@Override
	public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
		return readCookie(request, COOKIE_NAME)
			.map(this::deserialize)
			.orElse(null);
	}

	@Override
	public void saveAuthorizationRequest(
		OAuth2AuthorizationRequest authorizationRequest,
		HttpServletRequest request,
		HttpServletResponse response) {

		if (authorizationRequest == null) {
			deleteCookie(request, response, COOKIE_NAME);
			return;
		}

		Cookie cookie = new Cookie(COOKIE_NAME, serialize(authorizationRequest));
		cookie.setPath("/");
		cookie.setHttpOnly(true);
		cookie.setMaxAge(COOKIE_EXPIRE_SECONDS);
		cookie.setSecure(secureCookie);
		if (secureCookie) {
			cookie.setAttribute("SameSite", "None");
		}
		response.addCookie(cookie);
	}

	@Override
	public OAuth2AuthorizationRequest removeAuthorizationRequest(
		HttpServletRequest request,
		HttpServletResponse response) {

		OAuth2AuthorizationRequest authorizationRequest = loadAuthorizationRequest(request);
		if (authorizationRequest != null) {
			deleteCookie(request, response, COOKIE_NAME);
		}
		return authorizationRequest;
	}

	private java.util.Optional<String> readCookie(HttpServletRequest request, String name) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return java.util.Optional.empty();
		}
		for (Cookie cookie : cookies) {
			if (name.equals(cookie.getName())) {
				return java.util.Optional.of(cookie.getValue());
			}
		}
		return java.util.Optional.empty();
	}

	private void deleteCookie(HttpServletRequest request, HttpServletResponse response, String name) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return;
		}
		for (Cookie cookie : cookies) {
			if (name.equals(cookie.getName())) {
				Cookie expired = new Cookie(name, "");
				expired.setPath("/");
				expired.setHttpOnly(true);
				expired.setMaxAge(0);
				expired.setSecure(secureCookie);
				if (secureCookie) {
					expired.setAttribute("SameSite", "None");
				}
				response.addCookie(expired);
			}
		}
	}

	@SuppressWarnings("deprecation")
	private String serialize(OAuth2AuthorizationRequest request) {
		return Base64.getUrlEncoder().encodeToString(SerializationUtils.serialize(request));
	}

	@SuppressWarnings("deprecation")
	private OAuth2AuthorizationRequest deserialize(String value) {
		return (OAuth2AuthorizationRequest)SerializationUtils.deserialize(
			Base64.getUrlDecoder().decode(value));
	}
}
