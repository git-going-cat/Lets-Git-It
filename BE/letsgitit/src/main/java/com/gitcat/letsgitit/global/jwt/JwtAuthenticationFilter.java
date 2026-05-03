package com.gitcat.letsgitit.global.jwt;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.exception.ErrorResponse;

import io.jsonwebtoken.ExpiredJwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private final JwtProvider jwtProvider;
	private final UserDetailsService userDetailsService;
	private final AuthRedisRepository authRedisRepository;
	private final ObjectMapper objectMapper;

	@Override
	protected void doFilterInternal(
		HttpServletRequest request,
		HttpServletResponse response,
		FilterChain filterChain) throws ServletException, IOException {

		String token = resolveToken(request);

		if (token != null) {
			try {
				if (jwtProvider.validateToken(token)) {

					// 1. 블랙리스트 체크 — 로그아웃된 토큰
					if (authRedisRepository.isAccessTokenBlacklisted(token)) {
						log.debug("블랙리스트 처리된 토큰: {}", request.getRequestURI());
						sendUnauthorized(response, ErrorCode.TOKEN_BLACKLISTED);
						return;
					}

					String email = jwtProvider.getEmail(token);
					UserDetails userDetails = userDetailsService.loadUserByUsername(email);

					// 2. Redis에 저장된 AT와 일치 여부 확인 — 동시접속 차단
					if (userDetails instanceof CustomUserDetails customUserDetails) {
						String storedToken = authRedisRepository.getAccessToken(
							customUserDetails.getMemberId().toString());

						if (!token.equals(storedToken)) {
							log.debug("동시접속 차단. 다른 기기에서 로그인된 토큰: {}", request.getRequestURI());
							sendUnauthorized(response, ErrorCode.INVALID_TOKEN);
							return;
						}
					}

					// 3. SecurityContext 등록
					UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
						userDetails,
						null,
						userDetails.getAuthorities());
					authentication.setDetails(
						new WebAuthenticationDetailsSource().buildDetails(request));
					SecurityContextHolder.getContext().setAuthentication(authentication);
				}
			} catch (ExpiredJwtException e) {
				log.debug("만료된 Access Token: {}", request.getRequestURI());
			}
		}

		filterChain.doFilter(request, response);
	}

	// 인증 실패 응답 직접 작성
	// filterChain.doFilter()로 넘기면 Spring Security가 403으로 바꿔버려서
	// response에 직접 써줘야 401이 정확히 내려감
	private void sendUnauthorized(HttpServletResponse response, ErrorCode errorCode)
		throws IOException {
		response.setStatus(errorCode.getStatus());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write(objectMapper.writeValueAsString(ErrorResponse.of(errorCode)));
	}

	private String resolveToken(HttpServletRequest request) {
		String bearerToken = request.getHeader("Authorization");
		if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
			return bearerToken.substring(7);
		}
		return null;
	}
}
