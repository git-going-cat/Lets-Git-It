package com.gitcat.letsgitit.domain.ranking.dto.response;

import java.util.List;

public record SingleRankingScrollResponse(
	List<RankingEntry> rankings,
	Integer prevCursor,
	boolean hasPrev,
	Integer nextCursor,
	boolean hasNext) {
}
