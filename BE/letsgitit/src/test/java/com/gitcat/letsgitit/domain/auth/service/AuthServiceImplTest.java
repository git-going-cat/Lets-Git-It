package com.gitcat.letsgitit.domain.auth.service;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.*;

import java.util.UUID;

import jakarta.servlet.http.HttpServletResponse;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.gitcat.letsgitit.domain.auth.constants.AuthConstants;
import com.gitcat.letsgitit.domain.auth.dto.request.AuthRequest;
import com.gitcat.letsgitit.domain.auth.dto.response.AuthResponse;
import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.global.enums.AuthPurpose;
import com.gitcat.letsgitit.global.enums.Provider;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.jwt.JwtProvider;

import io.jsonwebtoken.ExpiredJwtException;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

	@InjectMocks
	private AuthServiceImpl authService;

	@Mock
	private AuthRedisRepository authRedisRepository;
	@Mock
	private MemberService memberService;
	@Mock
	private EmailService emailService;
	@Mock
	private PasswordEncoder passwordEncoder;
	@Mock
	private AuthenticationManager authenticationManager;
	@Mock
	private JwtProvider jwtProvider;

	private static final String EMAIL = "test@example.com";
	private static final String PASSWORD = "Password123!";
	private static final String ENCODED_PASSWORD = "$2a$10$encoded";
	private static final String ACCESS_TOKEN = "access.token.value";
	private static final String REFRESH_TOKEN = "refresh.token.value";

	// ===================== 이메일 인증 코드 발송 =====================

	@Test
	void 이메일_인증_코드_발송_성공() {
		// given
		given(memberService.existsByEmail(EMAIL)).willReturn(false);
		given(authRedisRepository.hasCooldown(EMAIL, "sign_up")).willReturn(false);
		given(authRedisRepository.incrementEmailSendCount(EMAIL, "sign_up")).willReturn(1L);
		doNothing().when(emailService).sendAuthCode(anyString(), anyString(), anyLong());

		// when
		AuthResponse.SendEmailCodeResponse response = authService.sendEmailCode(EMAIL, AuthPurpose.SIGN_UP);

		// then
		assertThat(response.expiredAt()).isNotNull();
		then(authRedisRepository).should().saveEmailCode(eq(EMAIL), eq("sign_up"), anyString());
		then(authRedisRepository).should().saveCooldown(EMAIL, "sign_up");
		then(emailService).should().sendAuthCode(eq(EMAIL), anyString(), eq(AuthConstants.AUTH_CODE_TTL_MINUTES));
	}

	@Test
	void 이메일_중복_시_EMAIL_DUPLICATE() {
		// given
		given(memberService.existsByEmail(EMAIL)).willReturn(true);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.sendEmailCode(EMAIL, AuthPurpose.SIGN_UP));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.EMAIL_DUPLICATE);
	}

	@Test
	void PASSWORD_RESET_미가입_이메일_시_MEMBER_NOT_FOUND() {
		// given
		given(memberService.existsByEmail(EMAIL)).willReturn(false);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.sendEmailCode(EMAIL, AuthPurpose.PASSWORD_RESET));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
	}

	@Test
	void WITHDRAW_미가입_이메일_시_MEMBER_NOT_FOUND() {
		// given
		given(memberService.existsByEmail(EMAIL)).willReturn(false);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.sendEmailCode(EMAIL, AuthPurpose.WITHDRAW));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
	}

	@Test
	void 쿨다운_중_재발송_시_TOO_MANY_REQUESTS() {
		// given
		given(memberService.existsByEmail(EMAIL)).willReturn(false);
		given(authRedisRepository.hasCooldown(EMAIL, "sign_up")).willReturn(true);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.sendEmailCode(EMAIL, AuthPurpose.SIGN_UP));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TOO_MANY_REQUESTS);
	}

	@Test
	void 발송_횟수_초과_시_TOO_MANY_EMAIL_REQUESTS() {
		// given
		given(memberService.existsByEmail(EMAIL)).willReturn(false);
		given(authRedisRepository.hasCooldown(EMAIL, "sign_up")).willReturn(false);
		given(authRedisRepository.incrementEmailSendCount(EMAIL, "sign_up"))
			.willReturn(AuthConstants.MAX_EMAIL_SEND_COUNT + 1);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.sendEmailCode(EMAIL, AuthPurpose.SIGN_UP));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TOO_MANY_EMAIL_REQUESTS);
	}

	// ===================== 이메일 인증 코드 검증 =====================

	@Test
	void 이메일_인증_코드_검증_성공() {
		// given
		String code = "ABC123";
		AuthRequest.VerifyEmailCodeRequest request = new AuthRequest.VerifyEmailCodeRequest(EMAIL, code);
		given(authRedisRepository.getEmailCode(EMAIL, "sign_up")).willReturn(code);

		// when
		authService.verifyEmailCode(request, AuthPurpose.SIGN_UP);

		// then
		then(authRedisRepository).should().deleteEmailCode(EMAIL, "sign_up");
		then(authRedisRepository).should().saveEmailVerified(EMAIL, "sign_up");
	}

	@Test
	void 코드_만료_시_EXPIRED_AUTH_CODE() {
		// given
		AuthRequest.VerifyEmailCodeRequest request = new AuthRequest.VerifyEmailCodeRequest(EMAIL, "ABC123");
		given(authRedisRepository.getEmailCode(EMAIL, "sign_up")).willReturn(null);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.verifyEmailCode(request, AuthPurpose.SIGN_UP));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.EXPIRED_AUTH_CODE);
	}

	@Test
	void 코드_불일치_시_INVALID_AUTH_CODE() {
		// given
		AuthRequest.VerifyEmailCodeRequest request = new AuthRequest.VerifyEmailCodeRequest(EMAIL, "WRONG1");
		given(authRedisRepository.getEmailCode(EMAIL, "sign_up")).willReturn("ABCDEF");

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.verifyEmailCode(request, AuthPurpose.SIGN_UP));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_AUTH_CODE);
	}

	// ===================== 회원가입 =====================

	@Test
	void 회원가입_성공() {
		// given
		AuthRequest.RegisterRequest request = new AuthRequest.RegisterRequest(EMAIL, PASSWORD);
		given(authRedisRepository.isEmailVerified(EMAIL, "sign_up")).willReturn(true);
		given(memberService.existsByEmail(EMAIL)).willReturn(false);
		given(passwordEncoder.encode(PASSWORD)).willReturn(ENCODED_PASSWORD);

		// when
		authService.register(request);

		// then
		then(memberService).should().createMember(eq(EMAIL), eq(ENCODED_PASSWORD));
		then(authRedisRepository).should().deleteEmailVerified(EMAIL, "sign_up");
	}

	@Test
	void 이메일_인증_미완료_시_EMAIL_NOT_VERIFIED() {
		// given
		AuthRequest.RegisterRequest request = new AuthRequest.RegisterRequest(EMAIL, PASSWORD);
		given(authRedisRepository.isEmailVerified(EMAIL, "sign_up")).willReturn(false);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.register(request));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.EMAIL_NOT_VERIFIED);
	}

	// ===================== 로컬 로그인 =====================

	@Test
	void 로그인_성공() {
		// given
		AuthRequest.LoginRequest request = new AuthRequest.LoginRequest(EMAIL, PASSWORD);
		HttpServletResponse response = mock(HttpServletResponse.class);

		UUID memberId = UUID.randomUUID();
		Member member = 회원_생성(memberId);

		given(memberService.findByEmail(EMAIL)).willReturn(member);
		given(authRedisRepository.getAccessToken(memberId.toString())).willReturn(null);
		given(authRedisRepository.getRefreshToken(memberId.toString())).willReturn(null);
		given(jwtProvider.createAccessToken(EMAIL)).willReturn(ACCESS_TOKEN);
		given(jwtProvider.createRefreshToken(EMAIL)).willReturn(REFRESH_TOKEN);

		// when
		AuthResponse.LoginResponse loginResponse = authService.login(request, response);

		// then
		assertThat(loginResponse.accessToken()).isEqualTo(ACCESS_TOKEN);
		then(authRedisRepository).should().saveAccessToken(memberId.toString(), ACCESS_TOKEN);
		then(authRedisRepository).should().saveRefreshToken(memberId.toString(), REFRESH_TOKEN);
		then(response).should().addHeader(eq(HttpHeaders.SET_COOKIE), anyString());
	}

	@Test
	void 비밀번호_불일치_시_INVALID_CREDENTIALS() {
		// given
		AuthRequest.LoginRequest request = new AuthRequest.LoginRequest(EMAIL, "wrongpassword");
		HttpServletResponse response = mock(HttpServletResponse.class);
		given(authenticationManager.authenticate(any())).willThrow(new BadCredentialsException("bad credentials"));

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.login(request, response));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_CREDENTIALS);
	}

	// ===================== 토큰 재발급 =====================

	@Test
	void 토큰_재발급_성공_RTR_전략() {
		// given
		HttpServletResponse response = mock(HttpServletResponse.class);
		UUID memberId = UUID.randomUUID();
		Member member = 회원_생성(memberId);
		String newAccessToken = "new.access.token";
		String newRefreshToken = "new.refresh.token";

		given(jwtProvider.validateToken(REFRESH_TOKEN)).willReturn(true);
		given(authRedisRepository.isRefreshTokenBlacklisted(REFRESH_TOKEN)).willReturn(false);
		given(jwtProvider.getEmail(REFRESH_TOKEN)).willReturn(EMAIL);
		given(memberService.findByEmail(EMAIL)).willReturn(member);
		given(authRedisRepository.getRefreshToken(memberId.toString())).willReturn(REFRESH_TOKEN);
		given(authRedisRepository.getAccessToken(memberId.toString())).willReturn(ACCESS_TOKEN);
		given(jwtProvider.getExpiration(ACCESS_TOKEN)).willReturn(-1L); // 이미 만료된 AT → 블랙리스트 등록 안 함
		given(jwtProvider.createAccessToken(EMAIL)).willReturn(newAccessToken);
		given(jwtProvider.createRefreshToken(EMAIL)).willReturn(newRefreshToken);

		// when
		AuthResponse.ReissueResponse reissueResponse = authService.reissue(REFRESH_TOKEN, response);

		// then
		assertThat(reissueResponse.accessToken()).isEqualTo(newAccessToken);
		then(authRedisRepository).should().saveAccessToken(memberId.toString(), newAccessToken);
		then(authRedisRepository).should().saveRefreshToken(memberId.toString(), newRefreshToken);
		then(response).should().addHeader(eq(HttpHeaders.SET_COOKIE), anyString());
	}

	@Test
	void RT_만료_시_REFRESH_TOKEN_EXPIRED() {
		// given
		HttpServletResponse response = mock(HttpServletResponse.class);
		given(jwtProvider.validateToken(REFRESH_TOKEN)).willThrow(ExpiredJwtException.class);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.reissue(REFRESH_TOKEN, response));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.REFRESH_TOKEN_EXPIRED);
	}

	@Test
	void RT_불일치_시_TOKEN_MISMATCH() {
		// given
		HttpServletResponse response = mock(HttpServletResponse.class);
		UUID memberId = UUID.randomUUID();
		Member member = 회원_생성(memberId);

		given(jwtProvider.validateToken(REFRESH_TOKEN)).willReturn(true);
		given(authRedisRepository.isRefreshTokenBlacklisted(REFRESH_TOKEN)).willReturn(false);
		given(jwtProvider.getEmail(REFRESH_TOKEN)).willReturn(EMAIL);
		given(memberService.findByEmail(EMAIL)).willReturn(member);
		given(authRedisRepository.getRefreshToken(memberId.toString())).willReturn("other.refresh.token");

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.reissue(REFRESH_TOKEN, response));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.TOKEN_MISMATCH);
	}

	// ===================== 로그아웃 =====================

	@Test
	void 로그아웃_성공() {
		// given
		HttpServletResponse response = mock(HttpServletResponse.class);
		UUID memberId = UUID.randomUUID();
		Member member = 회원_생성(memberId);

		given(jwtProvider.validateToken(ACCESS_TOKEN)).willReturn(true);
		given(jwtProvider.getEmail(ACCESS_TOKEN)).willReturn(EMAIL);
		given(memberService.findByEmail(EMAIL)).willReturn(member);
		given(jwtProvider.getExpiration(ACCESS_TOKEN)).willReturn(1000L);
		given(authRedisRepository.getRefreshToken(memberId.toString())).willReturn(REFRESH_TOKEN);
		given(jwtProvider.getExpiration(REFRESH_TOKEN)).willReturn(100000L);

		// when
		authService.logout(ACCESS_TOKEN, response);

		// then
		then(authRedisRepository).should().addAccessTokenToBlacklist(eq(ACCESS_TOKEN), anyLong());
		then(authRedisRepository).should().deleteAccessToken(memberId.toString());
		then(authRedisRepository).should().addRefreshTokenToBlacklist(eq(REFRESH_TOKEN), anyLong());
		then(authRedisRepository).should().deleteRefreshToken(memberId.toString());
		then(response).should().addHeader(eq(HttpHeaders.SET_COOKIE), anyString());
	}

	// ===================== 비밀번호 변경 (찾기용) =====================

	@Test
	void 비밀번호_변경_성공() {
		// given
		String newPassword = "NewPass123!";
		AuthRequest.ResetPasswordRequest request = new AuthRequest.ResetPasswordRequest(EMAIL, newPassword);
		Member member = Member.of(EMAIL, ENCODED_PASSWORD);

		given(authRedisRepository.isEmailVerified(EMAIL, "password_reset")).willReturn(true);
		given(memberService.findByEmail(EMAIL)).willReturn(member);
		given(passwordEncoder.matches(newPassword, ENCODED_PASSWORD)).willReturn(false);
		given(passwordEncoder.encode(newPassword)).willReturn("$2a$10$newencoded");

		// when
		authService.resetPassword(request);

		// then
		then(memberService).should().updatePassword(eq(member), anyString());
		then(authRedisRepository).should().deleteEmailVerified(EMAIL, "password_reset");
	}

	@Test
	void OAuth_계정_비밀번호_변경_시_OAUTH_ACCOUNT() {
		// given
		AuthRequest.ResetPasswordRequest request = new AuthRequest.ResetPasswordRequest(EMAIL, "NewPass123!");
		Member member = Member.ofOAuth(EMAIL, Provider.GOOGLE, "oauth-id");

		given(authRedisRepository.isEmailVerified(EMAIL, "password_reset")).willReturn(true);
		given(memberService.findByEmail(EMAIL)).willReturn(member);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.resetPassword(request));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.OAUTH_ACCOUNT);
	}

	@Test
	void 현재_비밀번호와_동일_시_SAME_AS_CURRENT_PASSWORD() {
		// given
		AuthRequest.ResetPasswordRequest request = new AuthRequest.ResetPasswordRequest(EMAIL, PASSWORD);
		Member member = Member.of(EMAIL, ENCODED_PASSWORD);

		given(authRedisRepository.isEmailVerified(EMAIL, "password_reset")).willReturn(true);
		given(memberService.findByEmail(EMAIL)).willReturn(member);
		given(passwordEncoder.matches(PASSWORD, ENCODED_PASSWORD)).willReturn(true);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.resetPassword(request));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.SAME_AS_CURRENT_PASSWORD);
	}

	// ===================== 비밀번호 검증 =====================

	@Test
	void 비밀번호_검증_성공() {
		// given
		AuthRequest.VerifyPasswordRequest request = new AuthRequest.VerifyPasswordRequest(PASSWORD);
		Member member = Member.of(EMAIL, ENCODED_PASSWORD);

		given(memberService.findByEmail(EMAIL)).willReturn(member);
		given(passwordEncoder.matches(PASSWORD, ENCODED_PASSWORD)).willReturn(true);

		// when & then
		assertDoesNotThrow(() -> authService.verifyPassword(request, EMAIL));
	}

	@Test
	void 비밀번호_불일치_시_PASSWORD_MISMATCH() {
		// given
		AuthRequest.VerifyPasswordRequest request = new AuthRequest.VerifyPasswordRequest("WrongPass!");
		Member member = Member.of(EMAIL, ENCODED_PASSWORD);

		given(memberService.findByEmail(EMAIL)).willReturn(member);
		given(passwordEncoder.matches("WrongPass!", ENCODED_PASSWORD)).willReturn(false);

		// when & then
		BusinessException ex = assertThrows(BusinessException.class,
			() -> authService.verifyPassword(request, EMAIL));

		assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.PASSWORD_MISMATCH);
	}

	// ===================== 헬퍼 =====================

	private Member 회원_생성(UUID id) {
		Member member = Member.of(EMAIL, ENCODED_PASSWORD);
		ReflectionTestUtils.setField(member, "id", id);
		return member;
	}
}
