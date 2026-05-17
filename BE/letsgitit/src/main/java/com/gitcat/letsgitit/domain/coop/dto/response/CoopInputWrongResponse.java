package com.gitcat.letsgitit.domain.coop.dto.response;

import java.util.UUID;

public record CoopInputWrongResponse(
	String type,
	UUID gameSessionId,
	long serverTime,
	UUID requestId,
	UUID playerId) {

	public static CoopInputWrongResponse of(
		UUID gameSessionId,
		UUID requestId,
		UUID playerId) {
		return new CoopInputWrongResponse(
			"COOP_INPUT_WRONG",
			gameSessionId,
			System.currentTimeMillis(),
			requestId,
			playerId);
	}
}
