package com.gitcat.letsgitit.domain.ranking.dto.response;

import java.util.UUID;

public record CoopRankingMemberDto(
	UUID playerId,
	String nickname) {
}
