package com.gitcat.letsgitit.domain.room.dto.response;

public record CommandSetItemDto(
	int commandSequence,
	String text,
	String branchName) {
}
