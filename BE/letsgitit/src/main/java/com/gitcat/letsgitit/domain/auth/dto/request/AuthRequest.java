package com.gitcat.letsgitit.domain.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class AuthRequest {

	// ===================== 이메일 인증 코드 발송 =====================
	public record SendEmailCodeRequest(

		@NotBlank(message = "이메일은 필수입니다.") @Email(message = "이메일 형식이 올바르지 않습니다.")
		String email) {
	}

	// ===================== 이메일 인증 코드 검증 =====================
	public record VerifyEmailCodeRequest(

		@NotBlank(message = "이메일은 필수입니다.") @Email(message = "이메일 형식이 올바르지 않습니다.")
		String email,

		@NotBlank(message = "인증 코드는 필수입니다.")
		String code) {
	}

	// ===================== 회원가입 =====================
	public record RegisterRequest(

		@NotBlank(message = "이메일은 필수입니다.") @Email(message = "이메일 형식이 올바르지 않습니다.")
		String email,

		@NotBlank(message = "비밀번호는 필수입니다.") @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,20}$", message = "비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.")
		String password) {
	}

	// ===================== 로컬 로그인 =====================
	public record LoginRequest(

		@NotBlank(message = "이메일은 필수입니다.") @Email(message = "이메일 형식이 올바르지 않습니다.")
		String email,

		@NotBlank(message = "비밀번호는 필수입니다.")
		String password // 로그인 시 형식 검증 없음 — 틀리면 INVALID_CREDENTIALS로 통일
	) {
	}

	// ===================== 비밀번호 변경 (비밀번호 찾기용, 인증 불필요) =====================
	public record ResetPasswordRequest(

		@NotBlank(message = "이메일은 필수입니다.") @Email(message = "이메일 형식이 올바르지 않습니다.")
		String email,

		@NotBlank(message = "새 비밀번호는 필수입니다.") @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,20}$", message = "비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.")
		String newPassword) {
	}

	// ===================== 비밀번호 검증 (인증 필요) =====================
	public record VerifyPasswordRequest(

		@NotBlank(message = "현재 비밀번호는 필수입니다.")
		String password) {
	}
}
