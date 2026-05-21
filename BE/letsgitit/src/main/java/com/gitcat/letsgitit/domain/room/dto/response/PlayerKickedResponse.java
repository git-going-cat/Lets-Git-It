package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;
import java.util.UUID;

public record PlayerKickedResponse(
	String type,
	UUID playerId,
	String nickname,
	List<PlayerInfoDto> remainMembers) {

	public static PlayerKickedResponse of(UUID playerId, String nickname, List<PlayerInfoDto> remainMembers) {
		return new PlayerKickedResponse("PLAYER_KICKED", playerId, nickname, remainMembers);
	}
}
