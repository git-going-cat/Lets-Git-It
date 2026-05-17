package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.UUID;

public record KickedResponse(
	String type,
	UUID playerId,
	Long roomId) {

	public static KickedResponse of(UUID playerId, Long roomId) {
		return new KickedResponse("KICKED", playerId, roomId);
	}
}
