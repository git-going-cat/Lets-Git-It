package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.List;
import java.util.UUID;

public record CommandExpiredMessage(
	String type,
	UUID gameSessionId,
	long serverTime,
	int commandSequence,
	List<ScoreEntryMessage> scores,
	ContributionProgressMessage progress) {

	public static CommandExpiredMessage of(
		UUID gameSessionId,
		int commandSequence,
		List<ScoreEntryMessage> scores,
		ContributionProgressMessage progress) {
		return new CommandExpiredMessage(
			"COMMAND_EXPIRED",
			gameSessionId,
			System.currentTimeMillis(),
			commandSequence,
			scores,
			progress);
	}
}
