package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.UUID;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ContributionExpireRequestMessage(
	@NotBlank(message = "type은 필수입니다.")
	String type,

	@NotNull(message = "requestId는 필수입니다.")
	UUID requestId,

	@NotNull(message = "gameSessionId는 필수입니다.")
	UUID gameSessionId,

	@NotNull(message = "commandSequence는 필수입니다.") @Min(value = 0, message = "commandSequence는 0 이상이어야 합니다.")
	Integer commandSequence) {

	@AssertTrue(message = "type은 COMMAND_EXPIRE_REQUEST이어야 합니다.")
	public boolean isCommandExpireRequestType() {
		return "COMMAND_EXPIRE_REQUEST".equals(type);
	}
}
