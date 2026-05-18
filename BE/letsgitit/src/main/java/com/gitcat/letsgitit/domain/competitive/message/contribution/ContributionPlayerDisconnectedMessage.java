package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.List;
import java.util.UUID;

public record ContributionPlayerDisconnectedMessage(
	String type,
	UUID gameSessionId,
	long serverTime,
	UUID disconnectedPlayerId,
	List<ScoreEntryMessage> scores,
	ContributionProgressMessage progress) {

	public static ContributionPlayerDisconnectedMessage of(
		UUID gameSessionId,
		UUID disconnectedPlayerId,
		List<ScoreEntryMessage> scores,
		ContributionProgressMessage progress) {
		return new ContributionPlayerDisconnectedMessage(
			"CONTRIBUTION_PLAYER_DISCONNECTED",
			gameSessionId,
			System.currentTimeMillis(),
			disconnectedPlayerId,
			scores,
			progress);
	}
}
