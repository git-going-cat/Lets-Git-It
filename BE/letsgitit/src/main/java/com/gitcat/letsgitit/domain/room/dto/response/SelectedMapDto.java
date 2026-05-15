package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.UUID;

public record SelectedMapDto(
	UUID mapId,
	String mapName,
	Integer difficulty) {
}
