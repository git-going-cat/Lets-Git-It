package com.gitcat.letsgitit.domain.room.dto.websocket.response;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

public record PlayerLeftResponse(
	String type,
	UUID leftPlayerId,
	String leftPlayerNickname,
	List<PlayerInfoDto> remainMembers) implements BaseWebSocketResponse {

	public static PlayerLeftResponse of(UUID leftPlayerId, String leftPlayerNickname,
		List<PlayerInfoDto> remainMembers) {
		return new PlayerLeftResponse("PLAYER_LEFT", leftPlayerId, leftPlayerNickname, remainMembers);
	}
}
