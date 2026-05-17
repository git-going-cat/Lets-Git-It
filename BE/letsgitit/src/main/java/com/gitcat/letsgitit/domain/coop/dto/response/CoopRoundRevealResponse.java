package com.gitcat.letsgitit.domain.coop.dto.response;

import java.util.List;
import java.util.UUID;

public record CoopRoundRevealResponse(
	String type,
	UUID gameSessionId,
	long serverTime,
	int round,
	boolean isReset,
	long revealStartsAt,
	List<CommandDto> commands) {

	public record CommandDto(
		int commandOrder,
		String commandText) {
	}

	public static CoopRoundRevealResponse of(
		UUID gameSessionId,
		int round,
		boolean isReset,
		List<CommandDto> commands) {
		long now = System.currentTimeMillis();
		return new CoopRoundRevealResponse(
			"COOP_ROUND_REVEAL",
			gameSessionId,
			now,
			round,
			isReset,
			now + 3000L,
			commands);
	}
}
