package com.gitcat.letsgitit.domain.room.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record HostTransferRequest(
	@NotBlank(message = "type은 필수입니다.")
	String type,

	@NotNull(message = "nextHostId는 필수입니다.")
	UUID nextHostId) {
}
