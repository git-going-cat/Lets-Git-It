package com.gitcat.letsgitit.domain.coop.dto.response;

import java.util.UUID;

public record CoopInputCorrectResponse(
	String type,
	UUID gameSessionId,
	long serverTime,
	UUID requestId,
	int sequence, // 전체 게임 기준 완료 순서 (1~20)
	int round, // 현재 라운드 (1~5)
	int stepInRound, // 라운드 내 완료 순서 (1~4)
	boolean isRoundComplete) {

	public static CoopInputCorrectResponse of(
		UUID gameSessionId,
		UUID requestId,
		int sequence,
		int round,
		int stepInRound,
		boolean isRoundComplete) {
		return new CoopInputCorrectResponse(
			"COOP_INPUT_CORRECT",
			gameSessionId,
			System.currentTimeMillis(),
			requestId,
			sequence,
			round,
			stepInRound,
			isRoundComplete);
	}
}
