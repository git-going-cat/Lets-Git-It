package com.gitcat.letsgitit.global.metrics;

import org.springframework.stereotype.Component;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AuthMetrics {

	private final MeterRegistry registry;

	public Timer.Sample start() {
		return Timer.start(registry);
	}

	// API 전체 응답 시간 (operation: send_email | verify_email | register | login | reissue | logout)
	public void recordOperation(Timer.Sample sample, String operation, boolean success) {
		sample.stop(registry.timer("auth.operation",
			"operation", operation,
			"status", success ? "success" : "error"));
	}

	// 예외 카운터: 실패 유형별 분포 분석용
	public void incrementError(String operation, String errorCode) {
		registry.counter("auth.error",
			"operation", operation,
			"error_code", errorCode).increment();
	}

	// 퍼널 지표: 이메일 인증 코드 발송
	public void incrementEmailCodeSent(String purpose) {
		registry.counter("auth.email_code.sent", "purpose", purpose).increment();
	}

	// 퍼널 지표: 이메일 인증 코드 검증 성공
	public void incrementEmailVerified(String purpose) {
		registry.counter("auth.email_code.verified", "purpose", purpose).increment();
	}

	// 퍼널 지표: 회원가입 완료 (result: new | reactivated)
	public void incrementRegisterCompleted(boolean reactivated) {
		registry.counter("auth.register.completed",
			"result", reactivated ? "reactivated" : "new").increment();
	}

	// 퍼널 지표: 로그인 성공 (type: local | oauth)
	public void incrementLoginSuccess(String type) {
		registry.counter("auth.login.success", "type", type).increment();
	}

	// 퍼널 지표: 로그인 실패 원인별
	public void incrementLoginFailed(String errorCode) {
		registry.counter("auth.login.failed", "error_code", errorCode).increment();
	}

	// 퍼널 지표: 토큰 재발급 빈도
	public void incrementTokenReissued() {
		registry.counter("auth.token.reissued").increment();
	}

	// 퍼널 지표: 로그아웃
	public void incrementLogout() {
		registry.counter("auth.logout").increment();
	}
}
