package com.gitcat.letsgitit.domain.coop.dto.response;

import java.util.List;

public record GraphDataDto(
	String viewBox,
	List<GraphNodeDto> nodes,
	List<GraphEdgeDto> edges) {
}
