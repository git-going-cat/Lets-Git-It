package com.gitcat.letsgitit.domain.competitive.dto;

import java.util.UUID;

public record ContributionPlayerCache(
	UUID playerId,
	String nickname,
	int bestContribution) {
}
