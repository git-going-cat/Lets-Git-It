package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.constants.CoopConstants;
import com.gitcat.letsgitit.domain.coop.dto.response.GraphDataDto;

public record CoopStartedResponse(
	String type,
	long serverTime,
	long startAt,
	UUID gameSessionId,
	int totalRounds,
	GraphDataDto graphData,
	List<CoopPlayerDto> players) implements GameStartPayload {

	public static CoopStartedResponse of(
		UUID gameSessionId,
		long now,
		GraphDataDto graphData,
		List<CoopPlayerDto> players) {
		return new CoopStartedResponse(
			"COOP_STARTED", now, now + CoopConstants.REVEAL_DURATION_MS,
			gameSessionId, 5, graphData, players);
	}
}
