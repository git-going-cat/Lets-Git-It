package com.gitcat.letsgitit.domain.ranking.dto.response;

public record UpdateContributionRankingResult(
	int newContribution,
	int newPlayCount,
	int rank,
	boolean contributionOverflow,
	boolean playCountOverflow) {
}
