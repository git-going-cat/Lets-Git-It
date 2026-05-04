package com.gitcat.letsgitit.domain.single.dto.response;

import java.util.List;

import com.gitcat.letsgitit.global.enums.Difficulty;

public record SingleSessionStartResponse(
	String sessionId,
	Difficulty difficulty,
	Integer bestScore,
	List<CommandSetDto> commandSet) {
	public static SingleSessionStartResponse of(
		String sessionId,
		Difficulty difficulty,
		Integer bestScore,
		List<CommandSetDto> commandSet) {
		return new SingleSessionStartResponse(sessionId, difficulty, bestScore, commandSet);
	}
}
