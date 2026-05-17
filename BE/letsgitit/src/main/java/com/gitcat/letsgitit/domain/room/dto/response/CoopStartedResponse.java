package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;
import java.util.UUID;

public record CoopStartedResponse(
	String type,
	long serverTime,
	long startAt,
	UUID gameSessionId,
	int totalRounds,
	String startGraphPicture,
	List<CoopPlayerDto> players) implements GameStartPayload {

	public static CoopStartedResponse of(
		UUID gameSessionId,
		long now,
		String startGraphPicture,
		List<CoopPlayerDto> players) {
		return new CoopStartedResponse(
			"COOP_STARTED", now, now + 3000,
			gameSessionId, 5, startGraphPicture, players);
	}
}
