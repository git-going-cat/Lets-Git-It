package com.gitcat.letsgitit.domain.room.dto.response;

import com.gitcat.letsgitit.domain.room.dto.RoomCache;

public record RoomSummaryDto(
	Long roomId,
	String title,
	String mode,
	int currentPlayers,
	int maxPlayers,
	boolean hasPassword,
	String roomState,
	SelectedMapDto selectedMap) {

	public static RoomSummaryDto from(RoomCache cache) {
		return new RoomSummaryDto(
			cache.roomId(), cache.title(), cache.mode(),
			cache.currentPlayers(), cache.maxPlayers(),
			cache.hasPassword(), cache.roomState(),
			cache.selectedMap());
	}
}
