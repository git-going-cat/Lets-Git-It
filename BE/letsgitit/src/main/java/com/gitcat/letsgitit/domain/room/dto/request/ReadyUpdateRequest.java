package com.gitcat.letsgitit.domain.room.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReadyUpdateRequest(
	@NotBlank(message = "type은 필수입니다.")
	String type,

	@NotNull(message = "isReady는 필수입니다.")
	Boolean isReady) {
}
