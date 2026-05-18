package com.gitcat.letsgitit.domain.competitive.dto;

import java.util.UUID;

public record ContributionRankingCache(
	int rank,
	UUID playerId,
	String nickname,
	int contribution,
	boolean disconnected) {
}
