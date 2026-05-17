package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.List;
import java.util.UUID;

public record ContributionGameEndMessage(
	String type,
	UUID gameSessionId,
	long serverTime,
	boolean isSuccess,
	String reason,
	List<ContributionRankingMessage> rankings,
	UUID winnerVideoTarget) {

	public static ContributionGameEndMessage completed(
		UUID gameSessionId,
		List<ContributionRankingMessage> rankings,
		UUID winnerVideoTarget) {
		return new ContributionGameEndMessage(
			"CONTRIBUTION_GAME_END",
			gameSessionId,
			System.currentTimeMillis(),
			true,
			"GAME_COMPLETED",
			rankings,
			winnerVideoTarget);
	}

	public static ContributionGameEndMessage playerDisconnected(UUID gameSessionId) {
		return new ContributionGameEndMessage(
			"CONTRIBUTION_GAME_END",
			gameSessionId,
			System.currentTimeMillis(),
			false,
			"PLAYER_DISCONNECTED",
			null,
			null);
	}
}
