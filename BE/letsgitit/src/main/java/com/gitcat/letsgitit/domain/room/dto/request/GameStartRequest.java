package com.gitcat.letsgitit.domain.room.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GameStartRequest(

	@NotBlank(message = "type은 필수입니다.")
	String type

) {
}
