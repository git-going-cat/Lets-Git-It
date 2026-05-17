package com.gitcat.letsgitit.domain.coop.dto.response;

import java.util.UUID;

public record CoopRoundAssignResponse(
	String type,
	UUID gameSessionId,
	long serverTime,
	int round,
	boolean isReset,
	String myCommandText,
	String wrongPlayerNickname // isReset: false 이면 null
) {

	public static CoopRoundAssignResponse of(
		UUID gameSessionId,
		int round,
		boolean isReset,
		String myCommandText,
		String wrongPlayerNickname) {
		return new CoopRoundAssignResponse(
			"COOP_ROUND_ASSIGN",
			gameSessionId,
			System.currentTimeMillis(),
			round,
			isReset,
			myCommandText,
			wrongPlayerNickname);
	}
}
