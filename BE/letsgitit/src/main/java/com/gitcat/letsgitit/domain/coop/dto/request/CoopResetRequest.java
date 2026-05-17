package com.gitcat.letsgitit.domain.coop.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CoopResetRequest(
	@NotBlank
	String type,
	@NotNull
	UUID requestId,
	@NotBlank
	String inputText) {
}
