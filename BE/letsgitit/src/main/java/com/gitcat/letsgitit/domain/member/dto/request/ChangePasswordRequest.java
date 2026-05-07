package com.gitcat.letsgitit.domain.member.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(

	// 토큰 탈취 후 Redis 키만으로 변경하는 공격을 방어하기 위한 재검증 필드
	@NotBlank(message = "현재 비밀번호는 필수입니다.")
	String currentPassword,

	@NotBlank(message = "새 비밀번호는 필수입니다.")
	String newPassword) {
}
