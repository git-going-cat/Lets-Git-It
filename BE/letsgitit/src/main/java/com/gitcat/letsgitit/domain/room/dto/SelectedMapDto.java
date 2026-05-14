package com.gitcat.letsgitit.domain.room.dto;

import java.util.UUID;

public record SelectedMapDto(
	UUID mapId,
	String mapName,
	Integer difficulty) {
}
