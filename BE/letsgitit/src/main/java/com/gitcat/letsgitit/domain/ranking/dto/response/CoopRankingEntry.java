package com.gitcat.letsgitit.domain.ranking.dto.response;

import java.util.List;

public record CoopRankingEntry(
	int rank,
	String teamName,
	String mapName,
	int difficulty,
	int elapsedTime,
	int totalWrongTypeCount,
	int totalWrongOrderCount,
	List<CoopRankingMemberDto> members) {
}
