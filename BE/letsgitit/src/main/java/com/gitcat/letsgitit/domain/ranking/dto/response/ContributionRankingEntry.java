package com.gitcat.letsgitit.domain.ranking.dto.response;

import java.util.UUID;

public record ContributionRankingEntry(
	int rank,
	UUID playerId,
	String nickname,
	int contribution,
	int playCount) {
}
