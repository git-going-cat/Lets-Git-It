package com.gitcat.letsgitit.global.jwt;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.*;

import java.util.Collections;
import java.util.UUID;

import jakarta.servlet.FilterChain;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.global.exception.ErrorCode;

import io.jsonwebtoken.ExpiredJwtException;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

	private static final String EMAIL = "test@example.com";
	private static final String ACCESS_TOKEN = "valid.access.token";

	@Mock
	private JwtProvider jwtProvider;

	@Mock
	private UserDetailsService userDetailsService;

	@Mock
	private AuthRedisRepository authRedisRepository;

	@Mock
	private FilterChain filterChain;

	private ObjectMapper objectMapper;
	private JwtAuthenticationFilter jwtAuthenticationFilter;

	@BeforeEach
	void setUp() {
		objectMapper = new ObjectMapper();
		jwtAuthenticationFilter = new JwtAuthenticationFilter(
			jwtProvider,
			userDetailsService,
			authRedisRepository,
			objectMapper);
		SecurityContextHolder.clearContext();
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void Authorization_헤더가_없으면_인증_없이_다음_필터로_넘긴다() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();

		jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

		verify(filterChain).doFilter(request, response);
		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
		assertThat(response.getStatus()).isEqualTo(200);
	}

	@Test
	void Bearer_형식이_아니면_인증_없이_다음_필터로_넘긴다() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.addHeader("Authorization", ACCESS_TOKEN);
		MockHttpServletResponse response = new MockHttpServletResponse();

		jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

		verify(filterChain).doFilter(request, response);
		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
		assertThat(response.getStatus()).isEqualTo(200);
	}

	@Test
	void 유효한_토큰이고_Redis_저장_토큰과_일치하면_SecurityContext에_인증을_등록한다() throws Exception {
		String memberId = UUID.randomUUID().toString();
		MockHttpServletRequest request = 인증_요청(ACCESS_TOKEN);
		MockHttpServletResponse response = new MockHttpServletResponse();

		CustomUserDetails userDetails = mock(CustomUserDetails.class);
		given(userDetails.getMemberId()).willReturn(memberId);
		given(userDetails.getAuthorities()).willReturn(Collections.emptyList());

		given(jwtProvider.validateToken(ACCESS_TOKEN)).willReturn(true);
		given(authRedisRepository.isAccessTokenBlacklisted(ACCESS_TOKEN)).willReturn(false);
		given(jwtProvider.getEmail(ACCESS_TOKEN)).willReturn(EMAIL);
		given(userDetailsService.loadUserByUsername(EMAIL)).willReturn(userDetails);
		given(authRedisRepository.getAccessToken(memberId)).willReturn(ACCESS_TOKEN);

		jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

		verify(filterChain).doFilter(request, response);

		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		assertThat(authentication).isNotNull();
		assertThat(authentication.getPrincipal()).isSameAs(userDetails);
		assertThat(authentication.isAuthenticated()).isTrue();
		assertThat(response.getStatus()).isEqualTo(200);
	}

	@Test
	void 블랙리스트_토큰이면_401_TOKEN_BLACKLISTED를_응답하고_다음_필터로_넘기지_않는다() throws Exception {
		MockHttpServletRequest request = 인증_요청(ACCESS_TOKEN);
		MockHttpServletResponse response = new MockHttpServletResponse();

		given(jwtProvider.validateToken(ACCESS_TOKEN)).willReturn(true);
		given(authRedisRepository.isAccessTokenBlacklisted(ACCESS_TOKEN)).willReturn(true);

		jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

		verify(filterChain, never()).doFilter(any(), any());
		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();

		assertThat(response.getStatus()).isEqualTo(ErrorCode.TOKEN_BLACKLISTED.getStatus());
		assertThat(response.getContentType()).isEqualTo("application/json;charset=UTF-8");
		assertThat(response.getCharacterEncoding()).isEqualTo("UTF-8");

		JsonNode body = objectMapper.readTree(response.getContentAsString());
		assertThat(body.get("code").asText()).isEqualTo("TOKEN_BLACKLISTED");
	}

	@Test
	void Redis_저장_토큰과_요청_토큰이_다르면_401_INVALID_TOKEN을_응답하고_다음_필터로_넘기지_않는다() throws Exception {
		String memberId = UUID.randomUUID().toString();
		MockHttpServletRequest request = 인증_요청(ACCESS_TOKEN);
		MockHttpServletResponse response = new MockHttpServletResponse();

		CustomUserDetails userDetails = mock(CustomUserDetails.class);
		given(userDetails.getMemberId()).willReturn(memberId);

		given(jwtProvider.validateToken(ACCESS_TOKEN)).willReturn(true);
		given(authRedisRepository.isAccessTokenBlacklisted(ACCESS_TOKEN)).willReturn(false);
		given(jwtProvider.getEmail(ACCESS_TOKEN)).willReturn(EMAIL);
		given(userDetailsService.loadUserByUsername(EMAIL)).willReturn(userDetails);
		given(authRedisRepository.getAccessToken(memberId)).willReturn("different.access.token");

		jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

		verify(filterChain, never()).doFilter(any(), any());
		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();

		assertThat(response.getStatus()).isEqualTo(ErrorCode.INVALID_TOKEN.getStatus());
		assertThat(response.getContentType()).isEqualTo("application/json;charset=UTF-8");
		assertThat(response.getCharacterEncoding()).isEqualTo("UTF-8");

		JsonNode body = objectMapper.readTree(response.getContentAsString());
		assertThat(body.get("code").asText()).isEqualTo("INVALID_TOKEN");
	}

	@Test
	void 만료된_토큰이면_인증을_등록하지_않고_다음_필터로_넘긴다() throws Exception {
		MockHttpServletRequest request = 인증_요청(ACCESS_TOKEN);
		MockHttpServletResponse response = new MockHttpServletResponse();

		given(jwtProvider.validateToken(ACCESS_TOKEN))
			.willThrow(mock(ExpiredJwtException.class));

		jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

		verify(filterChain).doFilter(request, response);
		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
		assertThat(response.getStatus()).isEqualTo(200);
	}

	@Test
	void 유효하지_않은_토큰이면_인증을_등록하지_않고_다음_필터로_넘긴다() throws Exception {
		MockHttpServletRequest request = 인증_요청(ACCESS_TOKEN);
		MockHttpServletResponse response = new MockHttpServletResponse();

		given(jwtProvider.validateToken(ACCESS_TOKEN)).willReturn(false);

		jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

		verify(filterChain).doFilter(request, response);
		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
		assertThat(response.getStatus()).isEqualTo(200);
	}

	private MockHttpServletRequest 인증_요청(String token) {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setRequestURI("/api/v1/auth/logout");
		request.addHeader("Authorization", "Bearer " + token);
		return request;
	}
}
