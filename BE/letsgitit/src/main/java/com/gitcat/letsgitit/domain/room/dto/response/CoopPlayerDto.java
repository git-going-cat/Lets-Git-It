package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.UUID;

public record CoopPlayerDto(
	UUID playerId,
	String nickname) {
}
