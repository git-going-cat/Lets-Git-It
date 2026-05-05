package com.gitcat.letsgitit.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.auth.service.CustomOAuth2UserService;
import com.gitcat.letsgitit.domain.member.service.CustomUserDetailsService;
import com.gitcat.letsgitit.global.jwt.CustomAccessDeniedHandler;
import com.gitcat.letsgitit.global.jwt.CustomAuthenticationEntryPoint;
import com.gitcat.letsgitit.global.jwt.JwtAuthenticationFilter;
import com.gitcat.letsgitit.global.jwt.JwtProvider;
import com.gitcat.letsgitit.global.oauth2.OAuth2FailureHandler;
import com.gitcat.letsgitit.global.oauth2.OAuth2SuccessHandler;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity // Spring Security 활성화
@RequiredArgsConstructor
public class SecurityConfig {

	private final JwtProvider jwtProvider;
	private final CustomUserDetailsService userDetailsService;
	private final AuthRedisRepository authRedisRepository;
	private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;
	private final CustomAccessDeniedHandler customAccessDeniedHandler;
	private final ObjectMapper objectMapper;
	private final CustomOAuth2UserService customOAuth2UserService;
	private final OAuth2SuccessHandler oAuth2SuccessHandler;
	private final OAuth2FailureHandler oAuth2FailureHandler;

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();
		config.addAllowedOriginPattern("*");
		config.addAllowedMethod("*");
		config.addAllowedHeader("*");
		config.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
			.cors(cors -> cors.configurationSource(corsConfigurationSource()))
			// CSRF 비활성화
			// - CSRF는 브라우저 세션 기반 인증에서 필요한 보호 기법
			// - JWT는 세션을 사용하지 않으므로 불필요
			.csrf(AbstractHttpConfigurer::disable)

			// 세션 비활성화
			// - JWT 방식은 서버가 세션을 저장하지 않음 (Stateless)
			// - STATELESS로 설정하면 Security가 세션을 생성하거나 사용하지 않음
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

			// 폼 로그인 비활성화 (우리는 JSON API 방식으로 로그인)
			.formLogin(AbstractHttpConfigurer::disable)

			// HTTP Basic 인증 비활성화 (팝업 로그인 창 방지)
			.httpBasic(AbstractHttpConfigurer::disable)

			// Spring Security 기본 logout 처리 비활성화
			// - 우리는 /api/v1/auth/logout Controller에서 직접 처리
			.logout(AbstractHttpConfigurer::disable)

			// 인증 실패 시 공통 에러 포맷으로 401 반환
			// - 토큰 없음 / 유효하지 않은 JWT 접근 시
			// - GlobalExceptionHandler는 Security 필터 레이어에 미적용되므로 EntryPoint에서 직접 처리
			.exceptionHandling(ex -> ex
				.authenticationEntryPoint(customAuthenticationEntryPoint)
				.accessDeniedHandler(customAccessDeniedHandler))

			// 경로별 접근 권한 설정
			.authorizeHttpRequests(auth -> auth
				// 인증 없이 접근 가능한 경로 (로그인/회원가입 관련)
				.requestMatchers(
					"/api/v1/auth/email/send", // 이메일 인증 코드 발송
					"/api/v1/auth/email/verify", // 이메일 인증 코드 검증
					"/api/v1/auth/register", // 회원가입
					"/api/v1/auth/login", // 로컬 로그인
					"/api/v1/auth/token", // OAuth 토큰 교환
					"/api/v1/auth/password/reset", // 비밀번호 변경 (비밀번호 찾기)
					"/api/v1/auth/reissue", // 토큰 재발급 (Refresh Token으로 요청)
					"/api/v1/oauth2/authorization/**", // 소셜 로그인 진입점 (커스텀 base URI)
					"/oauth2/**", // OAuth2 기본 경로
					"/login/oauth2/**", // OAuth2 콜백 수신 경로 (Spring Security 내부)
					"/swagger-ui/**", // Swagger UI
					"/api-docs/**", // Swagger API 문서
					"/actuator/**", // 모니터링 엔드포인트
					"/ws/**" // WebSocket
				).permitAll()
				// 그 외 모든 요청은 인증 필요
				.anyRequest().authenticated())

			.oauth2Login(oauth2 -> oauth2
				// 진입 URI를 /api/v1/oauth2/authorization/{provider}로 커스텀
				.authorizationEndpoint(endpoint -> endpoint.baseUri("/api/v1/oauth2/authorization"))
				// 구글 콜백 처리 URI (구글 Console에 등록한 redirect_uri와 일치해야 함)
				.redirectionEndpoint(endpoint -> endpoint.baseUri("/login/oauth2/code/*"))
				// 유저 정보 처리
				.userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
				// 성공/실패 핸들러
				.successHandler(oAuth2SuccessHandler)
				.failureHandler(oAuth2FailureHandler))

			// JWT 필터를 UsernamePasswordAuthenticationFilter 앞에 삽입
			// - Security의 기본 폼 로그인 필터보다 먼저 실행되게 함
			.addFilterBefore(
				new JwtAuthenticationFilter(jwtProvider, userDetailsService, authRedisRepository, objectMapper),
				UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}

	/**
	 * 비밀번호 암호화에 사용할 인코더
	 * BCrypt: 단방향 해시 + 솔트 자동 추가 → 같은 비밀번호도 매번 다른 해시값
	 * 회원가입 시 비밀번호 저장, 로그인 시 비교에 사용
	 */
	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	/**
	 * AuthenticationManager: Spring Security의 인증 처리 핵심 객체
	 * - 로그인 API에서 "이메일 + 비밀번호"를 검증할 때 직접 호출
	 * - AuthenticationConfiguration에서 자동 구성된 걸 그대로 꺼내 씀
	 */
	@Bean
	public AuthenticationManager authenticationManager(
		AuthenticationConfiguration authenticationConfiguration) throws Exception {
		return authenticationConfiguration.getAuthenticationManager();
	}
}
