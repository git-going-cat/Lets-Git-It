package com.gitcat.letsgitit.domain.ranking.dto.response;

import java.util.List;

public record ContributionRankingScrollResponse(
	List<ContributionRankingEntry> rankings,
	Integer prevCursor,
	boolean hasPrev,
	Integer nextCursor,
	boolean hasNext) {
}
