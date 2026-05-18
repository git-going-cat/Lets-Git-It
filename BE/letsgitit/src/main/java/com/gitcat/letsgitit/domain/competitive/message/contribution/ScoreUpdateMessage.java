package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.List;
import java.util.UUID;

public record ScoreUpdateMessage(
	String type,
	UUID gameSessionId,
	UUID requestId,
	long serverTime,
	int commandSequence,
	UUID winnerId,
	List<ScoreEntryMessage> scores,
	ContributionProgressMessage progress) {

	public static ScoreUpdateMessage of(
		UUID gameSessionId,
		UUID requestId,
		int commandSequence,
		UUID winnerId,
		List<ScoreEntryMessage> scores,
		ContributionProgressMessage progress) {
		return new ScoreUpdateMessage(
			"SCORE_UPDATE",
			gameSessionId,
			requestId,
			System.currentTimeMillis(),
			commandSequence,
			winnerId,
			scores,
			progress);
	}
}
