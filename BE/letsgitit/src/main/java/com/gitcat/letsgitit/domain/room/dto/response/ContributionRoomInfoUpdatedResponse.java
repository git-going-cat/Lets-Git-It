package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;

import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.global.enums.GameMode;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

public record ContributionRoomInfoUpdatedResponse(
	String type,
	Long roomId,
	String roomCode,
	String title,
	GameMode mode,
	RoomState roomState,
	Integer currentPlayers,
	Boolean hasPassword,
	Integer maxPlayers,
	List<PlayerInfoDto> members) implements BaseWebSocketResponse {

	public static ContributionRoomInfoUpdatedResponse from(ContributionRoomInfoResponse response) {
		return new ContributionRoomInfoUpdatedResponse(
			"CONTRIBUTION_ROOM_INFO_UPDATED",
			response.roomId(),
			response.roomCode(),
			response.title(),
			response.mode(),
			response.roomState(),
			response.currentPlayers(),
			response.hasPassword(),
			response.maxPlayers(),
			response.members());
	}
}
