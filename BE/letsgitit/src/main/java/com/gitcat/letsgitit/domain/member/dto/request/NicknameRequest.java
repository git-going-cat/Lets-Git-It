package com.gitcat.letsgitit.domain.member.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record NicknameRequest(
	@NotBlank(message = "닉네임을 입력해주세요.") @Size(min = 2, max = 6, message = "닉네임은 2~6자여야 합니다.") @Pattern(regexp = "^[가-힣a-zA-Z0-9]+$", message = "닉네임은 한글, 영문, 숫자만 사용 가능합니다.")
	String nickname) {
}
