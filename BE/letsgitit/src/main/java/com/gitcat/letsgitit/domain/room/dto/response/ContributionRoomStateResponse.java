package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;

import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.global.enums.GameMode;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

public record ContributionRoomStateResponse(
	String type,
	Long roomId,
	String roomCode,
	String title,
	GameMode mode,
	RoomState roomState,
	Integer currentPlayers,
	Integer maxPlayers,
	Boolean hasPassword,
	List<PlayerInfoDto> members) implements BaseWebSocketResponse {

	public static ContributionRoomStateResponse from(ContributionRoomInfoResponse response) {
		return new ContributionRoomStateResponse(
			"CONTRIBUTION_ROOM_STATE",
			response.roomId(),
			response.roomCode(),
			response.title(),
			response.mode(),
			response.roomState(),
			response.currentPlayers(),
			response.maxPlayers(),
			response.hasPassword(),
			response.members());
	}
}
