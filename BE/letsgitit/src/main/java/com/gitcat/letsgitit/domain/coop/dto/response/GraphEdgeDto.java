package com.gitcat.letsgitit.domain.coop.dto.response;

public record GraphEdgeDto(
	int from,
	int to,
	String type // solid / dashed / curve
) {
}
