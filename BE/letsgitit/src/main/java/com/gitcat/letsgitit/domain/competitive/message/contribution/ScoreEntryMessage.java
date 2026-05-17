package com.gitcat.letsgitit.domain.competitive.message.contribution;

import java.util.UUID;

public record ScoreEntryMessage(
	UUID playerId,
	String nickname,
	int contribution,
	int rank) {
}
