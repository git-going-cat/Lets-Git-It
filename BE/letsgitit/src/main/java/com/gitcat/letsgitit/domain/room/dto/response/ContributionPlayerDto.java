package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.UUID;

public record ContributionPlayerDto(
	UUID playerId,
	String nickname,
	int bestContribution) {
}
