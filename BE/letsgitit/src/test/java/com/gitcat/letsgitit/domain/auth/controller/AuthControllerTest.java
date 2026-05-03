package com.gitcat.letsgitit.domain.auth.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.auth.dto.request.AuthRequest;
import com.gitcat.letsgitit.domain.auth.dto.response.AuthResponse;
import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.auth.service.AuthService;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.entity.enums.OnboardingStatus;
import com.gitcat.letsgitit.domain.member.repository.MemberRepository;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.jwt.JwtProvider;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
	"spring.jpa.hibernate.ddl-auto=none",
	"spring.sql.init.mode=never",
	"management.health.mail.enabled=false"
})
@AutoConfigureMockMvc
class AuthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private JwtProvider jwtProvider;

	@MockitoBean
	private AuthService authService;

	@MockitoBean
	private AuthRedisRepository authRedisRepository;

	@MockitoBean
	private MemberRepository memberRepository;

	@MockitoBean
	private RedissonClient redissonClient;

	@MockitoBean
	private JavaMailSender javaMailSender;

	@MockitoBean(name = "authStringRedisTemplate")
	private StringRedisTemplate authStringRedisTemplate;

	@MockitoBean(name = "rankingStringRedisTemplate")
	private StringRedisTemplate rankingStringRedisTemplate;

	@MockitoBean(name = "gameStringRedisTemplate")
	private StringRedisTemplate gameStringRedisTemplate;

	private static final String EMAIL = "test@example.com";
	private static final String PASSWORD = "Password123!";

	// ===================== POST /email/send =====================

	@Test
	void 이메일_인증_코드_발송_성공() throws Exception {
		AuthResponse.SendEmailCodeResponse response = new AuthResponse.SendEmailCodeResponse(
			LocalDateTime.now().plusMinutes(5));
		given(authService.sendEmailCode(eq(EMAIL), any())).willReturn(response);

		String body = objectMapper.writeValueAsString(new AuthRequest.SendEmailCodeRequest(EMAIL));

		mockMvc.perform(post("/api/v1/auth/email/send")
			.param("purpose", "SIGN_UP")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(200))
			.andExpect(jsonPath("$.message").value("인증 메일 발송 성공"))
			.andExpect(jsonPath("$.data.expiredAt").exists());
	}

	@Test
	void 이메일_인증_코드_발송_이메일_중복() throws Exception {
		given(authService.sendEmailCode(eq(EMAIL), any()))
			.willThrow(new BusinessException(ErrorCode.EMAIL_DUPLICATE));

		String body = objectMapper.writeValueAsString(new AuthRequest.SendEmailCodeRequest(EMAIL));

		mockMvc.perform(post("/api/v1/auth/email/send")
			.param("purpose", "SIGN_UP")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("EMAIL_DUPLICATE"));
	}

	@Test
	void 이메일_인증_코드_발송_purpose_파라미터_누락() throws Exception {
		String body = objectMapper.writeValueAsString(new AuthRequest.SendEmailCodeRequest(EMAIL));

		mockMvc.perform(post("/api/v1/auth/email/send")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isBadRequest());
	}

	@Test
	void 이메일_인증_코드_발송_purpose_값_오류() throws Exception {
		String body = objectMapper.writeValueAsString(new AuthRequest.SendEmailCodeRequest(EMAIL));

		mockMvc.perform(post("/api/v1/auth/email/send")
			.param("purpose", "WRONG_PURPOSE")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isBadRequest());
	}

	// ===================== POST /email/verify =====================

	@Test
	void 이메일_인증_코드_검증_성공() throws Exception {
		doNothing().when(authService).verifyEmailCode(any(), any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.VerifyEmailCodeRequest(EMAIL, "ABC123"));

		mockMvc.perform(post("/api/v1/auth/email/verify")
			.param("purpose", "SIGN_UP")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").value("이메일 인증 성공"));
	}

	@Test
	void 이메일_인증_코드_검증_purpose_파라미터_누락() throws Exception {
		String body = objectMapper.writeValueAsString(
			new AuthRequest.VerifyEmailCodeRequest(EMAIL, "ABC123"));

		mockMvc.perform(post("/api/v1/auth/email/verify")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isBadRequest());
	}

	@Test
	void 이메일_인증_코드_만료() throws Exception {
		willThrow(new BusinessException(ErrorCode.EXPIRED_AUTH_CODE))
			.given(authService).verifyEmailCode(any(), any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.VerifyEmailCodeRequest(EMAIL, "ABC123"));

		mockMvc.perform(post("/api/v1/auth/email/verify")
			.param("purpose", "SIGN_UP")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("EXPIRED_AUTH_CODE"));
	}

	@Test
	void 이메일_인증_코드_불일치() throws Exception {
		willThrow(new BusinessException(ErrorCode.INVALID_AUTH_CODE))
			.given(authService).verifyEmailCode(any(), any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.VerifyEmailCodeRequest(EMAIL, "WRONG1"));

		mockMvc.perform(post("/api/v1/auth/email/verify")
			.param("purpose", "SIGN_UP")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_AUTH_CODE"));
	}

	// ===================== POST /register =====================

	@Test
	void 회원가입_성공() throws Exception {
		doNothing().when(authService).register(any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.RegisterRequest(EMAIL, PASSWORD));

		mockMvc.perform(post("/api/v1/auth/register")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.message").value("회원가입 성공"));
	}

	@Test
	void 회원가입_이메일_인증_미완료() throws Exception {
		willThrow(new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED))
			.given(authService).register(any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.RegisterRequest(EMAIL, PASSWORD));

		mockMvc.perform(post("/api/v1/auth/register")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"));
	}

	@Test
	void 회원가입_비밀번호_형식_불일치() throws Exception {
		String body = objectMapper.writeValueAsString(
			new AuthRequest.RegisterRequest(EMAIL, "12345678"));

		mockMvc.perform(post("/api/v1/auth/register")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_INPUT_VALUE"));
	}

	// ===================== POST /login =====================

	@Test
	void 로컬_로그인_성공() throws Exception {
		AuthResponse.LoginResponse loginResponse = new AuthResponse.LoginResponse(
			"access.token", false, "dobby", OnboardingStatus.NONE,
			"hair", "black", "body", "eye", "outfit", "white");
		given(authService.login(any(), any())).willReturn(loginResponse);

		String body = objectMapper.writeValueAsString(
			new AuthRequest.LoginRequest(EMAIL, PASSWORD));

		mockMvc.perform(post("/api/v1/auth/login")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").value("로그인 성공"))
			.andExpect(jsonPath("$.data.accessToken").value("access.token"));
	}

	@Test
	void 로컬_로그인_자격증명_불일치() throws Exception {
		given(authService.login(any(), any()))
			.willThrow(new BusinessException(ErrorCode.INVALID_CREDENTIALS));

		String body = objectMapper.writeValueAsString(
			new AuthRequest.LoginRequest(EMAIL, "wrongpass"));

		mockMvc.perform(post("/api/v1/auth/login")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	// ===================== POST /token =====================

	@Test
	void OAuth_토큰_교환_성공() throws Exception {
		String body = """
			{
			  "code": "VALID_CODE"
			}
			""";

		mockMvc.perform(post("/api/v1/auth/token")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").value("로그인 성공"))
			.andExpect(jsonPath("$.data.accessToken").exists())
			.andExpect(jsonPath("$.data.nickname").value("dobby"));
	}

	@Test
	void OAuth_토큰_교환_만료된_코드() throws Exception {
		String body = """
			{
			  "code": "EXPIRED_CODE"
			}
			""";

		mockMvc.perform(post("/api/v1/auth/token")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_AUTH_CODE"));
	}

	// ===================== POST /reissue =====================

	@Test
	void 토큰_재발급_성공() throws Exception {
		AuthResponse.ReissueResponse reissueResponse = new AuthResponse.ReissueResponse("new.access.token");
		given(authService.reissue(any(), any())).willReturn(reissueResponse);

		mockMvc.perform(post("/api/v1/auth/reissue")
			.cookie(new Cookie("refreshToken", "valid.refresh.token")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").value("토큰 재발급 성공"))
			.andExpect(jsonPath("$.data.accessToken").value("new.access.token"));
	}

	@Test
	void 토큰_재발급_쿠키_누락() throws Exception {
		mockMvc.perform(post("/api/v1/auth/reissue"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("MISSING_COOKIE"));
	}

	@Test
	void 토큰_재발급_RT_만료() throws Exception {
		given(authService.reissue(any(), any()))
			.willThrow(new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED));

		mockMvc.perform(post("/api/v1/auth/reissue")
			.cookie(new Cookie("refreshToken", "expired.refresh.token")))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("REFRESH_TOKEN_EXPIRED"));
	}

	// ===================== POST /logout =====================

	@Test
	void 로그아웃_성공() throws Exception {
		String accessToken = 유효한_토큰_생성();
		인증_필터_통과_설정(accessToken);
		doNothing().when(authService).logout(any(), any());

		mockMvc.perform(post("/api/v1/auth/logout")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").value("로그아웃 성공"));
	}

	@Test
	void 로그아웃_인증_없음() throws Exception {
		mockMvc.perform(post("/api/v1/auth/logout"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void 로그아웃_토큰_형식_오류() throws Exception {
		String accessToken = 유효한_토큰_생성();

		mockMvc.perform(post("/api/v1/auth/logout")
			.header(HttpHeaders.AUTHORIZATION, accessToken))
			.andExpect(status().isUnauthorized());
	}

	// ===================== PATCH /password/reset =====================

	@Test
	void 비밀번호_변경_성공() throws Exception {
		doNothing().when(authService).resetPassword(any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.ResetPasswordRequest(EMAIL, "NewPass123!"));

		mockMvc.perform(patch("/api/v1/auth/password/reset")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").value("비밀번호 변경 성공"));
	}

	@Test
	void 비밀번호_변경_이메일_인증_미완료() throws Exception {
		willThrow(new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED))
			.given(authService).resetPassword(any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.ResetPasswordRequest(EMAIL, "NewPass123!"));

		mockMvc.perform(patch("/api/v1/auth/password/reset")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"));
	}

	@Test
	void 비밀번호_변경_OAuth_계정() throws Exception {
		willThrow(new BusinessException(ErrorCode.OAUTH_ACCOUNT))
			.given(authService).resetPassword(any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.ResetPasswordRequest(EMAIL, "NewPass123!"));

		mockMvc.perform(patch("/api/v1/auth/password/reset")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("OAUTH_ACCOUNT"));
	}

	// ===================== POST /password/verify =====================

	@Test
	void 비밀번호_검증_성공() throws Exception {
		String accessToken = 유효한_토큰_생성();
		인증_필터_통과_설정(accessToken);
		doNothing().when(authService).verifyPassword(any(), any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.VerifyPasswordRequest(PASSWORD));

		mockMvc.perform(post("/api/v1/auth/password/verify")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.message").value("비밀번호 검증 성공"));
	}

	@Test
	void 비밀번호_검증_인증_없음() throws Exception {
		String body = objectMapper.writeValueAsString(
			new AuthRequest.VerifyPasswordRequest(PASSWORD));

		mockMvc.perform(post("/api/v1/auth/password/verify")
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void 비밀번호_검증_불일치() throws Exception {
		String accessToken = 유효한_토큰_생성();
		인증_필터_통과_설정(accessToken);
		willThrow(new BusinessException(ErrorCode.PASSWORD_MISMATCH))
			.given(authService).verifyPassword(any(), any());

		String body = objectMapper.writeValueAsString(
			new AuthRequest.VerifyPasswordRequest("WrongPass!"));

		mockMvc.perform(post("/api/v1/auth/password/verify")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
			.contentType(MediaType.APPLICATION_JSON)
			.content(body))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("PASSWORD_MISMATCH"));
	}

	// ===================== 헬퍼 =====================

	private void 인증_필터_통과_설정(String accessToken) {
		given(authRedisRepository.isAccessTokenBlacklisted(accessToken)).willReturn(false);
		given(authRedisRepository.getAccessToken(any())).willReturn(accessToken);
		given(memberRepository.findByEmail(EMAIL)).willReturn(Optional.of(테스트_회원_생성()));
	}

	private Member 테스트_회원_생성() {
		Member member = Member.of(EMAIL, "");
		ReflectionTestUtils.setField(member, "id", UUID.randomUUID());
		return member;
	}

	private String 유효한_토큰_생성() {
		return jwtProvider.createAccessToken(EMAIL);
	}
}
