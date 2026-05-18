package com.gitcat.letsgitit.domain.room.dto.response;

public record CreateContributionRoomResponse(
	Long roomId,
	String roomCode,
	String title,
	Boolean hasPassword,
	Integer maxPlayers) {
}
