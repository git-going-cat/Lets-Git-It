package com.gitcat.letsgitit.domain.auth.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.auth.constants.AuthConstants;
import com.gitcat.letsgitit.domain.auth.dto.request.AuthRequest;
import com.gitcat.letsgitit.domain.auth.dto.response.AuthResponse;
import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.global.enums.AuthPurpose;
import com.gitcat.letsgitit.global.enums.AuthType;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.jwt.JwtProvider;
import com.gitcat.letsgitit.global.metrics.AuthMetrics;
import com.gitcat.letsgitit.global.util.RandomCodeUtil;
import com.gitcat.letsgitit.global.websocket.WebSocketSessionManager;

import io.jsonwebtoken.ExpiredJwtException;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

	private final AuthRedisRepository authRedisRepository;
	private final MemberService memberService;
	private final EmailService emailService;
	private final PasswordEncoder passwordEncoder;
	private final AuthenticationManager authenticationManager;
	private final JwtProvider jwtProvider;
	private final AuthMetrics authMetrics;
	private final WebSocketSessionManager webSocketSessionManager;

	@Override
	public AuthResponse.SendEmailCodeResponse sendEmailCode(String email, AuthPurpose purpose) {
		Timer.Sample sample = authMetrics.start();
		boolean success = false;
		try {
			// 1. 목적별 이메일 존재 여부 검증
			if (purpose == AuthPurpose.SIGN_UP) {
				if (memberService.existsByEmail(email)) {
					throw new BusinessException(ErrorCode.EMAIL_DUPLICATE);
				}
			} else {
				if (!memberService.existsByEmail(email)) {
					throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
				}
			}

			// 2. 재발송 쿨다운 체크 (30초 이내 재요청 차단)
			if (authRedisRepository.hasCooldown(email, purpose.name().toLowerCase())) {
				throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS);
			}

			// 3. 목적별 발송 횟수 체크 (최대 3회)
			long sendCount = authRedisRepository.incrementEmailSendCount(email, purpose.name().toLowerCase());
			if (sendCount > AuthConstants.MAX_EMAIL_SEND_COUNT) {
				throw new BusinessException(ErrorCode.TOO_MANY_EMAIL_REQUESTS);
			}

			// 4. 인증 코드 생성 및 Redis 저장 (TTL: 5분)
			String code = generateAuthCode();
			authRedisRepository.saveEmailCode(email, purpose.name().toLowerCase(), code);

			// 5. 재발송 쿨다운 등록 (TTL: 30초)
			authRedisRepository.saveCooldown(email, purpose.name().toLowerCase());

			// 6. 이메일 발송
			emailService.sendAuthCode(email, code, AuthConstants.AUTH_CODE_TTL_MINUTES);

			// 7. 만료 시각 계산 후 반환
			LocalDateTime expiredAt = LocalDateTime.now()
				.plusMinutes(AuthConstants.AUTH_CODE_TTL_MINUTES);

			authMetrics.incrementEmailCodeSent(purpose.name().toLowerCase());
			log.info("[auth][sendEmailCode] email code sent. purpose={}", purpose);
			success = true;
			return new AuthResponse.SendEmailCodeResponse(expiredAt);
		} catch (BusinessException e) {
			authMetrics.incrementError("send_email", e.getErrorCode().name());
			throw e;
		} finally {
			authMetrics.recordOperation(sample, "send_email", success);
		}
	}

	// 인증 코드 생성
	// O/0, I/1 혼동 방지 문자셋에서 SecureRandom으로 6자리 추출
	private String generateAuthCode() {
		return RandomCodeUtil.generate(AuthConstants.AUTH_CODE_LENGTH, AuthConstants.AUTH_CODE_CHARS);
	}

	@Override
	public void verifyEmailCode(AuthRequest.VerifyEmailCodeRequest request, AuthPurpose purpose) {
		Timer.Sample sample = authMetrics.start();
		boolean success = false;
		try {
			String email = request.email();
			String inputCode = request.code();
			String purposeKey = purpose.name().toLowerCase();

			// 1. Redis에서 저장된 코드 조회
			String savedCode = authRedisRepository.getEmailCode(email, purposeKey);

			// 2. 코드가 없으면 만료된 것 (TTL 5분 초과 시 Redis에서 자동 삭제됨)
			if (savedCode == null) {
				throw new BusinessException(ErrorCode.EXPIRED_AUTH_CODE);
			}

			// 3. 코드 일치 여부 확인
			if (!savedCode.equals(inputCode)) {
				throw new BusinessException(ErrorCode.INVALID_AUTH_CODE);
			}

			// 4. 검증 완료 — 코드 즉시 삭제 (재사용 방지)
			authRedisRepository.deleteEmailCode(email, purposeKey);

			// 5. 인증 완료 상태 저장 (TTL: 10분)
			authRedisRepository.saveEmailVerified(email, purposeKey);

			authMetrics.incrementEmailVerified(purposeKey);
			log.info("[auth][verifyEmailCode] email code verified. purpose={}", purposeKey);
			success = true;
		} catch (BusinessException e) {
			authMetrics.incrementError("verify_email", e.getErrorCode().name());
			throw e;
		} finally {
			authMetrics.recordOperation(sample, "verify_email", success);
		}
	}

	@Override
	@Transactional
	public boolean register(AuthRequest.RegisterRequest request) {
		Timer.Sample sample = authMetrics.start();
		boolean success = false;
		try {
			String email = request.email();
			String password = request.password();

			// 1. 이메일 인증 완료 여부 확인
			if (!authRedisRepository.isEmailVerified(email, AuthPurpose.SIGN_UP.name().toLowerCase())) {
				throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
			}

			// 2. 비밀번호 암호화
			String encodedPassword = passwordEncoder.encode(password);

			// 3. 탈퇴 계정 포함 이메일 조회
			Optional<Member> existingMember = memberService.findByEmailIncludingDeleted(email);

			boolean isReactivated = false;

			if (existingMember.isPresent()) {
				Member member = existingMember.get();

				if (member.getDeletedAt() == null) {
					throw new BusinessException(ErrorCode.EMAIL_DUPLICATE);
				}

				long daysSinceDeleted = ChronoUnit.DAYS.between(member.getDeletedAt(), LocalDateTime.now());

				if (daysSinceDeleted <= 30) {
					member.reactivate();
					member.updatePassword(encodedPassword);
					isReactivated = true;
				} else {
					member.mask();
					memberService.flush();
					memberService.createMember(email, encodedPassword);
				}
			} else {
				memberService.createMember(email, encodedPassword);
			}

			// 4. 인증 완료 상태 삭제
			authRedisRepository.deleteEmailVerified(email, AuthPurpose.SIGN_UP.name().toLowerCase());

			authMetrics.incrementRegisterCompleted(isReactivated);
			log.info("[auth][register] member registered. reactivated={}", isReactivated);
			success = true;
			return isReactivated;
		} catch (BusinessException e) {
			authMetrics.incrementError("register", e.getErrorCode().name());
			throw e;
		} finally {
			authMetrics.recordOperation(sample, "register", success);
		}
	}

	@Override
	@Transactional
	public AuthResponse.LoginResponse login(
		AuthRequest.LoginRequest request,
		HttpServletResponse response) {
		Timer.Sample sample = authMetrics.start();
		boolean success = false;
		try {
			String email = request.email();
			String password = request.password();

			// 1. 이메일 + 비밀번호 인증
			try {
				authenticationManager.authenticate(
					new UsernamePasswordAuthenticationToken(email, password));
			} catch (AuthenticationException e) {
				authMetrics.incrementLoginFailed(ErrorCode.INVALID_CREDENTIALS.name());
				throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
			}

			// 2. 인증 성공 → DB에서 Member 조회
			Member member = memberService.findByEmail(email);
			String memberId = member.getId().toString();

			// 3. 기존 AT/RT 블랙리스트 등록 (동시접속 차단)
			String oldAccessToken = authRedisRepository.getAccessToken(memberId);
			if (oldAccessToken != null) {
				long remainingMs = jwtProvider.getExpiration(oldAccessToken);
				if (remainingMs > 0) {
					authRedisRepository.addAccessTokenToBlacklist(oldAccessToken, remainingMs);
				}
			}

			String oldRefreshToken = authRedisRepository.getRefreshToken(memberId);
			if (oldRefreshToken != null) {
				long remainingMs = jwtProvider.getExpiration(oldRefreshToken);
				if (remainingMs > 0) {
					authRedisRepository.addRefreshTokenToBlacklist(oldRefreshToken, remainingMs);
				}
			}
			webSocketSessionManager.notifyDisconnectByNewLogin(memberId, member.getNickname());

			// 4. 새 AT/RT 발급
			String accessToken = jwtProvider.createAccessToken(email,
				member.getNickname() != null ? member.getNickname() : "");
			String refreshToken = jwtProvider.createRefreshToken(email);

			// 5. AT/RT Redis 저장
			authRedisRepository.saveAccessToken(memberId, accessToken);
			authRedisRepository.saveRefreshToken(memberId, refreshToken);

			// 6. Refresh Token HttpOnly Cookie 세팅
			ResponseCookie cookie = ResponseCookie.from(AuthConstants.REFRESH_TOKEN_COOKIE, refreshToken)
				.httpOnly(true)
				.secure(true)
				.path("/")
				.maxAge(Duration.ofDays(7))
				.sameSite("None")
				.build();
			response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

			authMetrics.incrementLoginSuccess("local");
			log.info("[auth][login] login success. type=local");
			success = true;
			return AuthResponse.LoginResponse.from(member, accessToken, false);
		} catch (BusinessException e) {
			if (!e.getErrorCode().equals(ErrorCode.INVALID_CREDENTIALS)) {
				authMetrics.incrementError("login", e.getErrorCode().name());
			}
			throw e;
		} finally {
			authMetrics.recordOperation(sample, "login", success);
		}
	}

	@Override
	@Transactional
	public AuthResponse.LoginResponse loginWithOAuth(String tempCode, HttpServletResponse response) {
		Timer.Sample sample = authMetrics.start();
		boolean success = false;
		try {
			// 1. 임시코드 원자적 소비 (Redis GETDEL)
			String memberIdStr = authRedisRepository.consumeOAuthTempCode(tempCode);
			if (memberIdStr == null) {
				throw new BusinessException(ErrorCode.INVALID_AUTH_CODE);
			}

			// 2. 재활성화 여부 조회 후 삭제
			boolean isReactivated = authRedisRepository.getOAuthReactivated(tempCode);

			// 3. Member 조회
			Member member = memberService.findById(UUID.fromString(memberIdStr));
			String memberId = member.getId().toString();
			String email = member.getEmail();

			// 4. 기존 토큰 블랙리스트 처리 (동시접속 차단)
			String oldAccessToken = authRedisRepository.getAccessToken(memberId);
			if (oldAccessToken != null) {
				long remainingMs = jwtProvider.getExpiration(oldAccessToken);
				if (remainingMs > 0) {
					authRedisRepository.addAccessTokenToBlacklist(oldAccessToken, remainingMs);
				}
			}

			String oldRefreshToken = authRedisRepository.getRefreshToken(memberId);
			if (oldRefreshToken != null) {
				long remainingMs = jwtProvider.getExpiration(oldRefreshToken);
				if (remainingMs > 0) {
					authRedisRepository.addRefreshTokenToBlacklist(oldRefreshToken, remainingMs);
				}
			}
			webSocketSessionManager.notifyDisconnectByNewLogin(memberId, member.getNickname());

			// 5. JWT 발급
			String accessToken = jwtProvider.createAccessToken(email,
				member.getNickname() != null ? member.getNickname() : "");
			String refreshToken = jwtProvider.createRefreshToken(email);

			authRedisRepository.saveAccessToken(memberId, accessToken);
			authRedisRepository.saveRefreshToken(memberId, refreshToken);

			// 6. Refresh Token HttpOnly Cookie
			ResponseCookie cookie = ResponseCookie.from(AuthConstants.REFRESH_TOKEN_COOKIE, refreshToken)
				.httpOnly(true)
				.secure(true)
				.path("/")
				.maxAge(Duration.ofDays(7))
				.sameSite("None")
				.build();
			response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

			authMetrics.incrementLoginSuccess("oauth");
			log.info("[auth][login] login success. type=oauth");
			success = true;
			return AuthResponse.LoginResponse.from(member, accessToken, isReactivated);
		} catch (BusinessException e) {
			authMetrics.incrementError("login_oauth", e.getErrorCode().name());
			throw e;
		} finally {
			authMetrics.recordOperation(sample, "login_oauth", success);
		}
	}

	@Override
	public AuthResponse.ReissueResponse reissue(String refreshToken, HttpServletResponse response) {
		Timer.Sample sample = authMetrics.start();
		boolean success = false;
		try {
			// 1. RT 서명 검증
			try {
				if (!jwtProvider.validateToken(refreshToken)) {
					throw new BusinessException(ErrorCode.INVALID_TOKEN);
				}
			} catch (ExpiredJwtException e) {
				throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
			}

			// 2. RT 블랙리스트 체크
			if (authRedisRepository.isRefreshTokenBlacklisted(refreshToken)) {
				throw new BusinessException(ErrorCode.INVALID_TOKEN);
			}

			// 3. RT에서 이메일 추출
			String email = jwtProvider.getEmail(refreshToken);

			// 4. DB에서 Member 조회
			Member member = memberService.findByEmail(email);
			String memberId = member.getId().toString();

			// 5. Redis에 저장된 RT 조회
			String storedRefreshToken = authRedisRepository.getRefreshToken(memberId);
			if (storedRefreshToken == null) {
				throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
			}

			// 6. 쿠키의 RT와 Redis 저장값 비교
			if (!storedRefreshToken.equals(refreshToken)) {
				throw new BusinessException(ErrorCode.TOKEN_MISMATCH);
			}

			// 7. 기존 AT 블랙리스트 등록
			String oldAccessToken = authRedisRepository.getAccessToken(memberId);
			if (oldAccessToken != null) {
				long remainingMs = jwtProvider.getExpiration(oldAccessToken);
				if (remainingMs > 0) {
					authRedisRepository.addAccessTokenToBlacklist(oldAccessToken, remainingMs);
				}
			}

			// 8. 새 AT 발급 + Redis 저장
			String newAccessToken = jwtProvider.createAccessToken(email,
				member.getNickname() != null ? member.getNickname() : "");
			authRedisRepository.saveAccessToken(memberId, newAccessToken);

			// 9. 새 RT 발급 + Redis 저장 + Cookie 갱신 (RTR 전략)
			String newRefreshToken = jwtProvider.createRefreshToken(email);
			authRedisRepository.saveRefreshToken(memberId, newRefreshToken);

			ResponseCookie cookie = ResponseCookie.from(AuthConstants.REFRESH_TOKEN_COOKIE, newRefreshToken)
				.httpOnly(true)
				.secure(true)
				.path("/")
				.maxAge(Duration.ofDays(7))
				.sameSite("None")
				.build();
			response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

			authMetrics.incrementTokenReissued();
			log.info("[auth][reissue] token reissued.");
			success = true;
			return new AuthResponse.ReissueResponse(newAccessToken);
		} catch (BusinessException e) {
			authMetrics.incrementError("reissue", e.getErrorCode().name());
			throw e;
		} finally {
			authMetrics.recordOperation(sample, "reissue", success);
		}
	}

	@Override
	public void logout(String accessToken, HttpServletResponse response) {
		Timer.Sample sample = authMetrics.start();
		boolean success = false;
		try {
			// 1. AT 서명 검증
			if (!jwtProvider.validateToken(accessToken)) {
				throw new BusinessException(ErrorCode.INVALID_TOKEN);
			}

			// 2. AT에서 이메일 추출 → Member 조회 (탈퇴 직후 호출 가능하므로 soft delete 포함)
			String email = jwtProvider.getEmail(accessToken);
			Member member = memberService.findByEmailIncludingDeleted(email)
				.orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

			String memberId = member.getId().toString();

			// 3. AT 블랙리스트 등록 (TTL: 남은 만료 시간)
			long remainingMs = jwtProvider.getExpiration(accessToken);
			if (remainingMs > 0) {
				authRedisRepository.addAccessTokenToBlacklist(accessToken, remainingMs);
			}

			// 4. Redis에서 AT 삭제
			authRedisRepository.deleteAccessToken(memberId);

			// 5. Redis에서 RT 조회 후 블랙리스트 등록
			String refreshToken = authRedisRepository.getRefreshToken(memberId);
			if (refreshToken != null) {
				long refreshRemainingMs = jwtProvider.getExpiration(refreshToken);
				if (refreshRemainingMs > 0) {
					authRedisRepository.addRefreshTokenToBlacklist(refreshToken, refreshRemainingMs);
				}
			}

			// 6. Redis에서 RT 삭제
			authRedisRepository.deleteRefreshToken(memberId);
			webSocketSessionManager.notifyDisconnectByLogout(memberId, member.getNickname());

			// 7. HttpOnly Cookie 만료 처리
			ResponseCookie expiredCookie = ResponseCookie.from(AuthConstants.REFRESH_TOKEN_COOKIE, "")
				.httpOnly(true)
				.secure(true)
				.path("/")
				.maxAge(0)
				.sameSite("None")
				.build();
			response.addHeader(HttpHeaders.SET_COOKIE, expiredCookie.toString());

			authMetrics.incrementLogout();
			log.info("[auth][logout] logout success.");
			success = true;
		} catch (BusinessException e) {
			authMetrics.incrementError("logout", e.getErrorCode().name());
			throw e;
		} finally {
			authMetrics.recordOperation(sample, "logout", success);
		}
	}

	@Override
	@Transactional
	public void resetPassword(AuthRequest.ResetPasswordRequest request) {
		Timer.Sample sample = authMetrics.start();
		boolean success = false;
		try {
			String email = request.email();
			String newPassword = request.newPassword();

			// 1. 이메일 인증 완료 여부 확인
			//    PURPOSE_RESET 목적으로 인증 완료된 상태여야 함
			if (!authRedisRepository.isEmailVerified(email, AuthPurpose.PASSWORD_RESET.name().toLowerCase())) {
				throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
			}

			// 2. 가입된 회원인지 확인
			Member member = memberService.findByEmail(email);

			// 3. OAuth 계정 체크 — 소셜 로그인 계정은 비밀번호 없음
			if (member.getAuthType() == AuthType.OAUTH) {
				throw new BusinessException(ErrorCode.OAUTH_ACCOUNT);
			}

			// 4. 현재 비밀번호와 동일한지 체크
			if (passwordEncoder.matches(newPassword, member.getPassword())) {
				throw new BusinessException(ErrorCode.SAME_AS_CURRENT_PASSWORD);
			}

			// 5. 비밀번호 변경
			memberService.updatePassword(member, passwordEncoder.encode(newPassword));

			// 6. 인증 완료 상태 삭제
			authRedisRepository.deleteEmailVerified(email, AuthPurpose.PASSWORD_RESET.name().toLowerCase());

			log.info("[auth][resetPassword] password reset success.");
			success = true;
		} catch (BusinessException e) {
			authMetrics.incrementError("reset_password", e.getErrorCode().name());
			throw e;
		} finally {
			authMetrics.recordOperation(sample, "reset_password", success);
		}
	}

	@Override
	public void verifyPassword(AuthRequest.VerifyPasswordRequest request, String email) {
		Timer.Sample sample = authMetrics.start();
		boolean success = false;
		try {
			// 1. 로그인된 사용자 조회
			Member member = memberService.findByEmail(email);

			// 2. OAuth 계정 체크 — 소셜 로그인 계정은 비밀번호 없음
			if (member.getAuthType() == AuthType.OAUTH) {
				throw new BusinessException(ErrorCode.OAUTH_ACCOUNT);
			}

			// 3. 비밀번호 일치 여부 확인
			//    BCrypt matches() — 입력값을 해시해서 저장된 해시와 비교
			if (!passwordEncoder.matches(request.password(), member.getPassword())) {
				throw new BusinessException(ErrorCode.PASSWORD_MISMATCH);
			}

			log.info("[auth][verifyPassword] password verified.");
			success = true;
		} catch (BusinessException e) {
			authMetrics.incrementError("verify_password", e.getErrorCode().name());
			throw e;
		} finally {
			authMetrics.recordOperation(sample, "verify_password", success);
		}
	}
}
