package com.gitcat.letsgitit.domain.coop.dto.response;

import java.util.UUID;

public record CoopResetWrongResponse(
	String type,
	UUID gameSessionId,
	long serverTime,
	UUID requestId,
	UUID playerId) {

	public static CoopResetWrongResponse of(
		UUID gameSessionId,
		UUID requestId,
		UUID playerId) {
		return new CoopResetWrongResponse(
			"COOP_RESET_WRONG",
			gameSessionId,
			System.currentTimeMillis(),
			requestId,
			playerId);
	}
}
