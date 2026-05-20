package com.gitcat.letsgitit.domain.ranking.dto.response;

import java.util.List;

public record ContributionRankingInitialResponse(
	int year,
	int month,
	int week,
	List<ContributionRankingEntry> top3,
	MyContributionRank myRank,
	List<ContributionRankingEntry> around,
	Integer prevCursor,
	boolean hasPrev,
	Integer nextCursor,
	boolean hasNext) {
	public record MyContributionRank(int rank, int contribution, int playCount) {
	}
}
