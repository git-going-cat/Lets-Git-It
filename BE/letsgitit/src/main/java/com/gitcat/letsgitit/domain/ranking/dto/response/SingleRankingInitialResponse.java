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
	Integer nextCursor, // null 이면 마지막 페이지
	boolean hasNext) {
}
