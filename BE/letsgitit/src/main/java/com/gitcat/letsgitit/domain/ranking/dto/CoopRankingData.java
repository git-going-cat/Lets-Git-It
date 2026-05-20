package com.gitcat.letsgitit.domain.ranking.dto;

import java.util.List;

/**
 * Redis Hash JSON 매핑용 내부 DTO (Source of Truth)
 */
public record CoopRankingData(
	String coopResultId,
	String teamName,
	String mapName,
	int difficulty,
	int elapsedTime,
	int totalWrongOrderCount,
	int totalWrongTypeCount,
	long registeredAt,
	List<String> memberIds) {
}
