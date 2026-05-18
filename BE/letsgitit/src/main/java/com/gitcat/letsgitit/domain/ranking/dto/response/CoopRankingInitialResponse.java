package com.gitcat.letsgitit.domain.ranking.dto.response;

import java.util.List;

public record CoopRankingInitialResponse(
	int year,
	int month,
	int week,
	List<CoopRankingEntry> top3,
	CoopRankingEntry myRank,
	List<CoopRankingEntry> around,
	Integer prevCursor,
	boolean hasPrev,
	Integer nextCursor,
	boolean hasNext) {
}
