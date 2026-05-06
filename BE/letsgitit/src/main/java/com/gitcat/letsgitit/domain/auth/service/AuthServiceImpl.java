package com.gitcat.letsgitit.domain.auth.service;

import java.security.SecureRandom;
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

import io.jsonwebtoken.ExpiredJwtException;
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

	// Math.random() 대신 SecureRandom 사용
	// → 암호학적으로 안전한 난수 생성기, 인증 코드 예측 불가능
	private final SecureRandom secureRandom = new SecureRandom();

	@Override
	public AuthResponse.SendEmailCodeResponse sendEmailCode(String email, AuthPurpose purpose) {

		// 1. 목적별 이메일 존재 여부 검증
		if (purpose == AuthPurpose.SIGN_UP) {
			// 회원가입: 이미 존재하는 이메일이면 중복
			if (memberService.existsByEmail(email)) {
				throw new BusinessException(ErrorCode.EMAIL_DUPLICATE);
			}
		} else {
			// 비밀번호 찾기 / 탈퇴: 가입된 이메일이어야 함
			if (!memberService.existsByEmail(email)) {
				throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
			}
		}

		// 2. 재발송 쿨다운 체크 (30초 이내 재요청 차단)
		//    Redis에 cooldown 키가 살아있으면 TOO_MANY_REQUESTS
		if (authRedisRepository.hasCooldown(email, purpose.name().toLowerCase())) {
			throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS);
		}

		// 3. 목적별 발송 횟수 체크 (최대 3회)
		//    incrementEmailSendCount는 증가 후 현재 값을 반환
		long sendCount = authRedisRepository.incrementEmailSendCount(email, purpose.name().toLowerCase());
		if (sendCount > AuthConstants.MAX_EMAIL_SEND_COUNT) {
			throw new BusinessException(ErrorCode.TOO_MANY_EMAIL_REQUESTS);
		}

		// 4. 인증 코드 생성 및 Redis 저장 (TTL: 5분)
		String code = generateAuthCode();
		authRedisRepository.saveEmailCode(email, purpose.name().toLowerCase(), code);

		// 5. 재발송 쿨다운 등록 (TTL: 30초)
		//    코드 저장 이후에 쿨다운 등록해야
		//    저장 실패 시 쿨다운만 걸리는 상황을 방지
		authRedisRepository.saveCooldown(email, purpose.name().toLowerCase());

		// 6. 이메일 발송
		emailService.sendAuthCode(email, code, AuthConstants.AUTH_CODE_TTL_MINUTES);

		// 7. 만료 시각 계산 후 반환
		LocalDateTime expiredAt = LocalDateTime.now()
			.plusMinutes(AuthConstants.AUTH_CODE_TTL_MINUTES);

		log.debug("이메일 인증 코드 발송 완료. email: {}, purpose: {}", email, purpose);
		return new AuthResponse.SendEmailCodeResponse(expiredAt);
	}

	// 인증 코드 생성
	// O/0, I/1 혼동 방지 문자셋에서 SecureRandom으로 6자리 추출
	private String generateAuthCode() {
		StringBuilder code = new StringBuilder(AuthConstants.AUTH_CODE_LENGTH);
		for (int i = 0; i < AuthConstants.AUTH_CODE_LENGTH; i++) {
			int index = secureRandom.nextInt(AuthConstants.AUTH_CODE_CHARS.length());
			code.append(AuthConstants.AUTH_CODE_CHARS.charAt(index));
		}
		return code.toString();
	}

	@Override
	public void verifyEmailCode(AuthRequest.VerifyEmailCodeRequest request, AuthPurpose purpose) {
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
		//    이후 회원가입/비밀번호 변경 API에서 이 키를 확인함
		authRedisRepository.saveEmailVerified(email, purposeKey);

		log.debug("이메일 인증 완료. email: {}", email);
	}

	@Override
	@Transactional
	public boolean register(AuthRequest.RegisterRequest request) {
		String email = request.email();
		String password = request.password();

		// 1. 이메일 인증 완료 여부 확인
		//    verifyEmailCode 호출 시 Redis에 저장한 키가 살아있는지 체크
		if (!authRedisRepository.isEmailVerified(email, AuthPurpose.SIGN_UP.name().toLowerCase())) {
			throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
		}

		// 2. 비밀번호 암호화
		//    BCrypt로 단방향 해시 — 같은 비밀번호도 매번 다른 해시값
		String encodedPassword = passwordEncoder.encode(password);

		// 3. 탈퇴 계정 포함 이메일 조회
		//    @SQLRestriction(deleted_at IS NULL)을 우회해 탈퇴 회원까지 포함해서 조회
		//    → 재가입 / 중복 가입 / 신규 가입 세 가지 케이스를 분기 처리
		Optional<Member> existingMember = memberService.findByEmailIncludingDeleted(email);

		boolean isReactivated = false;

		if (existingMember.isPresent()) {
			Member member = existingMember.get();

			if (member.getDeletedAt() == null) {
				// 3-1. 탈퇴하지 않은 정상 계정이 이미 존재 → 이메일 중복
				//      인증 완료 후 가입 시도 사이에 다른 사람이 같은 이메일로 가입했을 경우 방어
				throw new BusinessException(ErrorCode.EMAIL_DUPLICATE);
			}

			long daysSinceDeleted = ChronoUnit.DAYS.between(member.getDeletedAt(), LocalDateTime.now());

			if (daysSinceDeleted <= 30) {
				// 3-2. 탈퇴 후 30일 이내 재가입 → 기존 계정 재활성화
				//      deletedAt을 null로 되돌리고 새 비밀번호로 업데이트
				//      닉네임, 캐릭터, 플레이 기록 등 기존 데이터 유지
				member.reactivate();
				member.updatePassword(encodedPassword);
				isReactivated = true;
			} else {
				// 3-3. 탈퇴 후 30일 초과 → 기존 계정 마스킹 후 신규 계정 생성
				//      email, nickname을 랜덤값으로 덮어 개인정보 보호
				//      이후 같은 이메일로 신규 계정을 생성할 수 있도록 처리
				member.mask();
				memberService.flush();
				memberService.createMember(email, encodedPassword);
			}
		} else {
			// 3-4. 탈퇴 이력 없는 완전 신규 가입
			memberService.createMember(email, encodedPassword);
		}

		// 4. 인증 완료 상태 삭제
		//    회원가입 완료 후 Redis 키 정리 — 재사용 방지
		authRedisRepository.deleteEmailVerified(email, AuthPurpose.SIGN_UP.name().toLowerCase());

		log.debug("회원가입 완료. email: {}", email);

		return isReactivated;
	}

	@Override
	@Transactional
	public AuthResponse.LoginResponse login(
		AuthRequest.LoginRequest request,
		HttpServletResponse response) {

		String email = request.email();
		String password = request.password();

		// 1. 이메일 + 비밀번호 인증
		//    AuthenticationManager가 내부적으로 CustomUserDetailsService.loadUserByUsername() 호출
		//    → DB에서 유저 조회 → BCrypt 비밀번호 비교
		//    실패 시 AuthenticationException 발생 → INVALID_CREDENTIALS로 변환
		try {
			authenticationManager.authenticate(
				new UsernamePasswordAuthenticationToken(email, password));
		} catch (AuthenticationException e) {
			// 이메일 없음, 비밀번호 틀림 모두 INVALID_CREDENTIALS로 통일
			// 구분해서 내려주면 공격자에게 힌트가 됨
			throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
		}

		// 2. 인증 성공 → DB에서 Member 조회
		Member member = memberService.findByEmail(email);

		String memberId = member.getId().toString();

		// 3. 기존 AT/RT 블랙리스트 등록 (동시접속 차단)
		//    이미 로그인된 기기가 있으면 기존 토큰 무효화
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

		// 4. 새 AT/RT 발급
		String accessToken = jwtProvider.createAccessToken(email);
		String refreshToken = jwtProvider.createRefreshToken(email);

		// 5. Access Token + Refresh Token Redis 저장 (동시접속 차단용)
		//    키: auth:token:access:{memberId}, auth:token:refresh:{memberId}
		authRedisRepository.saveAccessToken(memberId, accessToken);
		authRedisRepository.saveRefreshToken(memberId, refreshToken);

		// 6. Refresh Token HttpOnly Cookie 세팅
		//    JS에서 접근 불가 → XSS 공격으로부터 보호
		ResponseCookie cookie = ResponseCookie.from(AuthConstants.REFRESH_TOKEN_COOKIE, refreshToken)
			.httpOnly(true) // JS 접근 차단
			.secure(true) // HTTPS에서만 전송
			.path("/") // 모든 경로에서 쿠키 전송
			.maxAge(Duration.ofDays(7))
			.sameSite("None") // 크로스 도메인 요청 허용 (프론트-백 도메인 분리 환경)
			.build();

		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

		log.debug("로그인 완료. email: {}", email);

		// 7. Access Token + 유저 정보 반환
		return AuthResponse.LoginResponse.from(member, accessToken, false);
	}

	@Override
	@Transactional
	public AuthResponse.LoginResponse loginWithOAuth(String tempCode, HttpServletResponse response) {

		// 1. 임시코드 원자적 소비 (Redis GETDEL) — 조회와 삭제를 단일 명령으로 처리
		//    동일 코드로 동시 요청이 들어와도 하나만 memberId를 획득하고 나머지는 null 반환
		String memberIdStr = authRedisRepository.consumeOAuthTempCode(tempCode);
		if (memberIdStr == null) {
			// null = 만료(30초 초과), 존재하지 않는 코드, 또는 이미 소비된 코드
			throw new BusinessException(ErrorCode.INVALID_AUTH_CODE);
		}

		// 2. 재활성화 여부 조회 후 삭제
		//    OAuth2SuccessHandler에서 저장한 재활성화 플래그
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

		// 5. JWT 발급
		String accessToken = jwtProvider.createAccessToken(email);
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

		log.debug("OAuth 토큰 교환 완료. email: {}", email);

		// 7. Access Token + 유저 정보 + 재활성화 여부 반환
		return AuthResponse.LoginResponse.from(member, accessToken, isReactivated);
	}

	@Override
	public AuthResponse.ReissueResponse reissue(String refreshToken, HttpServletResponse response) {

		// 1. RT 서명 검증
		//    서명이 유효하지 않으면 INVALID_TOKEN
		try {
			if (!jwtProvider.validateToken(refreshToken)) {
				throw new BusinessException(ErrorCode.INVALID_TOKEN); // 형식 오류
			}
		} catch (ExpiredJwtException e) {
			throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED); // 만료
		}

		// 2. RT 블랙리스트 체크
		//    로그아웃되거나 동시접속으로 무효화된 RT
		if (authRedisRepository.isRefreshTokenBlacklisted(refreshToken)) {
			throw new BusinessException(ErrorCode.INVALID_TOKEN);
		}

		// 3. RT에서 이메일 추출
		String email = jwtProvider.getEmail(refreshToken);

		// 4. DB에서 Member 조회
		Member member = memberService.findByEmail(email);

		String memberId = member.getId().toString();

		// 5. Redis에 저장된 RT 조회
		//    없으면 만료된 것 → 재로그인 필요
		String storedRefreshToken = authRedisRepository.getRefreshToken(memberId);
		if (storedRefreshToken == null) {
			throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
		}

		// 6. 쿠키의 RT와 Redis 저장값 비교
		//    다르면 다른 기기에서 로그인한 것
		if (!storedRefreshToken.equals(refreshToken)) {
			throw new BusinessException(ErrorCode.TOKEN_MISMATCH);
		}

		// 7. 기존 AT 블랙리스트 등록
		//    Redis에서 기존 AT 조회 후 블랙리스트 등록
		String oldAccessToken = authRedisRepository.getAccessToken(memberId);
		if (oldAccessToken != null) {
			long remainingMs = jwtProvider.getExpiration(oldAccessToken);
			if (remainingMs > 0) {
				authRedisRepository.addAccessTokenToBlacklist(oldAccessToken, remainingMs);
			}
		}

		// 8. 새 AT 발급 + Redis 저장
		String newAccessToken = jwtProvider.createAccessToken(email);
		authRedisRepository.saveAccessToken(memberId, newAccessToken);

		// 9. 새 RT 발급 + Redis 저장 + Cookie 갱신
		//    RT도 새로 발급해서 만료 시간 연장 (RTR 전략)
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

		log.debug("토큰 재발급 완료. email: {}", email);
		return new AuthResponse.ReissueResponse(newAccessToken);
	}

	@Override
	public void logout(String accessToken, HttpServletResponse response) {

		// 1. AT 서명 검증
		if (!jwtProvider.validateToken(accessToken)) {
			throw new BusinessException(ErrorCode.INVALID_TOKEN);
		}

		// 2. AT에서 이메일 추출 → Member 조회
		//    withdraw() 이후 호출될 수 있으므로 soft delete된 회원도 포함해서 조회
		//    findByEmail()은 @SQLRestriction으로 deleted_at IS NULL 조건이 걸려 탈퇴 직후 MEMBER_NOT_FOUND 발생
		String email = jwtProvider.getEmail(accessToken);
		Member member = memberService.findByEmailIncludingDeleted(email)
			.orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

		String memberId = member.getId().toString();

		// 3. AT 블랙리스트 등록 (TTL: 남은 만료 시간)
		//    만료 전까지 해당 AT로 API 호출 차단
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

		// 7. HttpOnly Cookie 만료 처리
		//    maxAge(0)으로 즉시 만료
		ResponseCookie expiredCookie = ResponseCookie.from(AuthConstants.REFRESH_TOKEN_COOKIE, "")
			.httpOnly(true)
			.secure(true)
			.path("/")
			.maxAge(0) // 즉시 만료
			.sameSite("None")
			.build();
		response.addHeader(HttpHeaders.SET_COOKIE, expiredCookie.toString());

		log.debug("로그아웃 완료. email: {}", email);
	}

	@Override
	@Transactional
	public void resetPassword(AuthRequest.ResetPasswordRequest request) {
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

		log.debug("비밀번호 변경 완료. email: {}", email);
	}

	@Override
	public void verifyPassword(AuthRequest.VerifyPasswordRequest request, String email) {

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

		log.debug("비밀번호 검증 완료. email: {}", email);
	}
}
