package com.gitcat.letsgitit.domain.coop.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CoopInputRequest(

	@NotBlank(message = "type은 필수입니다.")
	String type,

	@NotNull(message = "requestId는 필수입니다.")
	UUID requestId,

	@NotBlank(message = "inputText는 필수입니다.") @Size(min = 1, max = 50, message = "inputText는 1자 이상 50자 이하여야 합니다.")
	String inputText

) {
}
