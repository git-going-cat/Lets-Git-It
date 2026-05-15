package com.gitcat.letsgitit.domain.room.dto.response;

import com.gitcat.letsgitit.domain.room.dto.RoomCache;

public record RoomSearchResponse(
	Long roomId,
	String title,
	String mode,
	int currentPlayers,
	int maxPlayers,
	boolean hasPassword,
	String roomState) {

	public static RoomSearchResponse from(RoomCache cache) {
		return new RoomSearchResponse(
			cache.roomId(), cache.title(), cache.mode(),
			cache.currentPlayers(), cache.maxPlayers(),
			cache.hasPassword(), cache.roomState());
	}
}
