package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.UUID;

public record ContributionRankingMessage(
	int rank,
	UUID playerId,
	String nickname,
	int contribution) {
}
