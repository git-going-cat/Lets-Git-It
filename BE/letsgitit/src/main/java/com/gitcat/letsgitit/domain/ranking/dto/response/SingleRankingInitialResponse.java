package com.gitcat.letsgitit.domain.ranking.dto.response;

import java.util.List;

public record SingleRankingInitialResponse(
	String difficulty,
	int year,
	int month,
	int week,
	List<RankingEntry> top3,
	RankingEntry myRank,
	List<RankingEntry> around,
	Integer prevCursor,
	boolean hasPrev,
	Integer nextCursor,
	boolean hasNext) {
}
