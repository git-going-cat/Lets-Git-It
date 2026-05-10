package com.gitcat.letsgitit.domain.single.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

import com.gitcat.letsgitit.global.enums.Difficulty;

public record SingleSessionStartResponse(
	String sessionId,
	Difficulty difficulty,
	Integer bestScore,
	List<CommandSetDto> commandSet,
	OffsetDateTime expiresAt) {
	public static SingleSessionStartResponse of(
		String sessionId,
		Difficulty difficulty,
		Integer bestScore,
		List<CommandSetDto> commandSet,
		OffsetDateTime expiresAt) {
		return new SingleSessionStartResponse(sessionId, difficulty, bestScore, commandSet, expiresAt);
	}
}
