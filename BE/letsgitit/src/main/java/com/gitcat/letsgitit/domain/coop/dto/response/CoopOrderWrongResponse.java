package com.gitcat.letsgitit.domain.coop.dto.response;

import java.util.UUID;

public record CoopOrderWrongResponse(
	String type,
	UUID gameSessionId,
	long serverTime,
	UUID requestId,
	UUID resetTargetPlayerId,
	String nickname) {

	public static CoopOrderWrongResponse of(
		UUID gameSessionId,
		UUID requestId,
		UUID resetTargetPlayerId,
		String nickname) {
		return new CoopOrderWrongResponse(
			"COOP_ORDER_WRONG",
			gameSessionId,
			System.currentTimeMillis(),
			requestId,
			resetTargetPlayerId,
			nickname);
	}
}
