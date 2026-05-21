package com.gitcat.letsgitit.domain.single.dto;

import java.util.UUID;

import com.gitcat.letsgitit.global.enums.Difficulty;

public record SingleSessionCache(
	String sessionId,
	UUID memberId,
	Difficulty difficulty,
	boolean terminated) {
	public static SingleSessionCache of(String sessionId, UUID memberId, Difficulty difficulty) {
		return new SingleSessionCache(sessionId, memberId, difficulty, false);
	}

	public SingleSessionCache terminate() {
		return new SingleSessionCache(sessionId, memberId, difficulty, true);
	}
}
