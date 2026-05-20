package com.gitcat.letsgitit.domain.coop.dto.response;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.entity.CoopMap;

public class CoopMapResponse {

	public record MapListResponse(List<MapDto> maps) {
	}

	public record MapDto(
		UUID mapId,
		String mapName,
		int difficulty,
		boolean isActive,
		String updatedAt) {

		public static MapDto from(CoopMap map) {
			return new MapDto(
				map.getId(),
				map.getName(),
				map.getDifficulty(),
				map.isActive(),
				map.getUpdatedAt()
					.atZone(ZoneId.of("Asia/Seoul"))
					.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
		}
	}
}
