package com.gitcat.letsgitit.domain.coop.dto.response;

import java.util.List;
import java.util.UUID;

public record CoopGameEndResponse(
	String type,
	UUID gameSessionId,
	long serverTime,
	boolean isSuccess,
	String reason,
	Integer elapsedTime, // 성공 시만 유효
	List<ResultDto> results // 성공 시만 유효
) {

	public record ResultDto(
		UUID playerId,
		String nickname,
		int wrongTypeCount,
		int wrongOrderCount,
		int ranking,
		boolean isNewRecord) {
	}

	public static CoopGameEndResponse success(
		UUID gameSessionId,
		int elapsedTime,
		List<ResultDto> results) {
		return new CoopGameEndResponse(
			"COOP_GAME_END",
			gameSessionId,
			System.currentTimeMillis(),
			true,
			"GAME_COMPLETED",
			elapsedTime,
			results);
	}

	public static CoopGameEndResponse disconnected(UUID gameSessionId) {
		return new CoopGameEndResponse(
			"COOP_GAME_END",
			gameSessionId,
			System.currentTimeMillis(),
			false,
			"PLAYER_DISCONNECTED",
			null,
			null);
	}

	public static CoopGameEndResponse failure(UUID gameSessionId) {
		return new CoopGameEndResponse(
			"COOP_GAME_END",
			gameSessionId,
			System.currentTimeMillis(),
			false,
			"DB_SAVE_FAILED",
			null,
			null);
	}
}
