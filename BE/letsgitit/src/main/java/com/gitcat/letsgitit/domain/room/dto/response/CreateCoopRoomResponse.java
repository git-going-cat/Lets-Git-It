package com.gitcat.letsgitit.domain.room.dto.response;

public record CreateCoopRoomResponse(
	Long roomId,
	String teamName,
	String roomCode,
	String title,
	Boolean hasPassword,
	Integer maxPlayers,
	SelectedMapDto selectedMap) {
}
