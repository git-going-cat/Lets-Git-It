package com.gitcat.letsgitit.domain.room.dto.websocket.response;

import java.util.List;

import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

public record PlayerJoinedResponse(
	String type,
	RoomState roomState,
	PlayerInfoDto joinedPlayer,
	List<PlayerInfoDto> allMembers) implements BaseWebSocketResponse {

	public static PlayerJoinedResponse of(
		RoomState roomState,
		PlayerInfoDto joinedPlayer,
		List<PlayerInfoDto> allMembers) {
		return new PlayerJoinedResponse("PLAYER_JOINED", roomState, joinedPlayer, allMembers);
	}
}
