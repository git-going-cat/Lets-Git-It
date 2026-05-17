package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.UUID;

public record ContributionInputFailedMessage(
	String type,
	UUID gameSessionId,
	UUID requestId,
	long serverTime,
	UUID playerId,
	String errorReason) {

	public static ContributionInputFailedMessage of(
		UUID gameSessionId,
		UUID requestId,
		UUID playerId,
		String errorReason) {
		return new ContributionInputFailedMessage(
			"CONTRIBUTION_INPUT_FAILED",
			gameSessionId,
			requestId,
			System.currentTimeMillis(),
			playerId,
			errorReason);
	}
}
