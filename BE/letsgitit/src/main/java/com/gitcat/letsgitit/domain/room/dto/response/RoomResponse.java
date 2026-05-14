package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;

import com.gitcat.letsgitit.domain.room.dto.RoomCache;
import com.gitcat.letsgitit.domain.room.dto.SelectedMapDto;

public class RoomResponse {

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

	public record RoomListResponse(List<RoomSummaryDto> rooms) {
	}

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
}
