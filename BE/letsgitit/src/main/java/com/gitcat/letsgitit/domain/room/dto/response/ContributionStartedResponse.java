package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;
import java.util.UUID;

public record ContributionStartedResponse(
	String type,
	long serverTime,
	long startAt,
	UUID gameSessionId,
	int commandSetId,
	String initialBranch,
	List<CommandSetItemDto> commandSet,
	List<ContributionPlayerDto> players) implements GameStartPayload {

	public static ContributionStartedResponse of(
		UUID gameSessionId,
		long now,
		int commandSetId,
		String initialBranch,
		List<CommandSetItemDto> commandSet,
		List<ContributionPlayerDto> players) {
		return new ContributionStartedResponse(
			"CONTRIBUTION_STARTED", now, now + 3000,
			gameSessionId, commandSetId, initialBranch, commandSet, players);
	}
}
