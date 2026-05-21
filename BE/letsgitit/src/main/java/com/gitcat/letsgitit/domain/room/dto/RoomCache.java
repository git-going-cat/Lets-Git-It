package com.gitcat.letsgitit.domain.room.dto;

import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;

public record RoomCache(
	Long roomId,
	String title,
	String mode,
	int currentPlayers,
	int maxPlayers,
	boolean hasPassword,
	String roomState,
	SelectedMapDto selectedMap) {
}
