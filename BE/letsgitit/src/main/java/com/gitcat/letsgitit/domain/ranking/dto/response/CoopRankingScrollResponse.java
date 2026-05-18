package com.gitcat.letsgitit.domain.ranking.dto.response;

import java.util.List;

public record CoopRankingScrollResponse(
	List<CoopRankingEntry> rankings,
	Integer prevCursor,
	boolean hasPrev,
	Integer nextCursor,
	boolean hasNext) {
}
