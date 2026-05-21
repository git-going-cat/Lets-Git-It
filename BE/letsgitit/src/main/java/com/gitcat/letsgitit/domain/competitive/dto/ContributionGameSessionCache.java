package com.gitcat.letsgitit.domain.competitive.dto;

import java.util.List;
import java.util.UUID;

public record ContributionGameSessionCache(
	Long roomId,
	UUID gameSessionId,
	int commandSetId,
	String status,
	long startAt,
	int totalCommands,
	String initialBranch,
	List<ContributionCommandCache> commands,
	List<ContributionPlayerCache> players) {

	public static ContributionGameSessionCache inProgress(
		Long roomId,
		UUID gameSessionId,
		int commandSetId,
		long startAt,
		String initialBranch,
		List<ContributionCommandCache> commands,
		List<ContributionPlayerCache> players) {
		return new ContributionGameSessionCache(
			roomId,
			gameSessionId,
			commandSetId,
			"IN_PROGRESS",
			startAt,
			commands.size(),
			initialBranch,
			commands,
			players);
	}

	public ContributionGameSessionCache ended() {
		return new ContributionGameSessionCache(
			roomId,
			gameSessionId,
			commandSetId,
			"ENDED",
			startAt,
			totalCommands,
			initialBranch,
			commands,
			players);
	}
}
