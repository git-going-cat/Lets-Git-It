package com.gitcat.letsgitit.domain.coop.dto.response;

public record GraphNodeDto(
	int sequence,
	int x,
	int y,
	String label,
	String branch,
	int activateOnRound,
	int activateOnStep) {
}
