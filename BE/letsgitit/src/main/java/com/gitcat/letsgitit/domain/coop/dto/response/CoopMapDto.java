package com.gitcat.letsgitit.domain.coop.dto.response;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.entity.CoopMap;

public record CoopMapDto(
	UUID mapId,
	String mapName,
	int difficulty,
	boolean isActive,
	String updatedAt) {

	public static CoopMapDto from(CoopMap map) {
		return new CoopMapDto(
			map.getId(),
			map.getName(),
			map.getDifficulty(),
			map.isActive(),
			map.getUpdatedAt()
				.atZone(ZoneId.of("Asia/Seoul"))
				.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
	}
}
