package com.gitcat.letsgitit.domain.room.dto.websocket.response;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

public record HostDelegatedResponse(
	String type,
	UUID newHostId,
	String newHostNickname,
	List<PlayerInfoDto> remainMembers) implements BaseWebSocketResponse {

	public static HostDelegatedResponse of(PlayerInfoDto newHost, List<PlayerInfoDto> remainMembers) {
		return new HostDelegatedResponse("HOST_DELEGATED", newHost.playerId(), newHost.nickname(), remainMembers);
	}
}
