package com.gitcat.letsgitit.domain.single.dto;

import java.util.UUID;

import com.gitcat.letsgitit.global.enums.Difficulty;

public record SingleSessionCache(
	String sessionId,
	UUID memberId,
	Difficulty difficulty) {
	public static SingleSessionCache of(String sessionId, UUID memberId, Difficulty difficulty) {
		return new SingleSessionCache(sessionId, memberId, difficulty);
	}
}
