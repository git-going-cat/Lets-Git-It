package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.UUID;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ContributionInputMessage(
	@NotBlank(message = "type은 필수입니다.")
	String type,

	@NotNull(message = "requestId는 필수입니다.")
	UUID requestId,

	@NotNull(message = "gameSessionId는 필수입니다.")
	UUID gameSessionId,

	@Min(value = 0, message = "commandSequence는 0 이상이어야 합니다.")
	Integer commandSequence,

	@NotBlank(message = "inputText는 필수입니다.")
	String inputText) {

	@AssertTrue(message = "type은 CONTRIBUTION_INPUT이어야 합니다.")
	public boolean isContributionInputType() {
		return "CONTRIBUTION_INPUT".equals(type);
	}
}
