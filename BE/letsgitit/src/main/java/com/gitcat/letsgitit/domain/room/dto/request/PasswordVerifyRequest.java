package com.gitcat.letsgitit.domain.room.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PasswordVerifyRequest(
	@NotBlank
	String password) {
}
