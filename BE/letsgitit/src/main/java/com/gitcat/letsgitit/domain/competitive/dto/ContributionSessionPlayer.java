package com.gitcat.letsgitit.domain.competitive.dto;

import java.util.UUID;

public record ContributionSessionPlayer(
	UUID playerId,
	String nickname,
	int bestContribution) {
}
