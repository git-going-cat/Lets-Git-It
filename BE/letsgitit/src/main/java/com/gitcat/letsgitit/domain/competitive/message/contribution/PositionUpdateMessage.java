package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.UUID;

public record PositionUpdateMessage(
	String type,
	UUID gameSessionId,
	long serverTime,
	UUID requestId,
	UUID playerId,
	String branch) {

	public static PositionUpdateMessage of(UUID gameSessionId, UUID requestId, UUID playerId, String branch) {
		return new PositionUpdateMessage(
			"POSITION_UPDATE",
			gameSessionId,
			System.currentTimeMillis(),
			requestId,
			playerId,
			branch);
	}
}
