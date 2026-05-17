package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;

import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.global.enums.GameMode;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

public record CoopRoomInfoUpdatedResponse(
	String type,
	Long roomId,
	String roomCode,
	String title,
	String teamName,
	GameMode mode,
	RoomState roomState,
	Integer currentPlayers,
	Integer maxPlayers,
	Boolean hasPassword,
	SelectedMapDto selectedMap,
	List<PlayerInfoDto> members) implements BaseWebSocketResponse {

	public static CoopRoomInfoUpdatedResponse from(CoopRoomInfoResponse response) {
		return new CoopRoomInfoUpdatedResponse(
			"COOP_ROOM_INFO_UPDATED",
			response.roomId(),
			response.roomCode(),
			response.title(),
			response.teamName(),
			response.mode(),
			response.roomState(),
			response.currentPlayers(),
			response.maxPlayers(),
			response.hasPassword(),
			response.selectedMap(),
			response.members());
	}
}
