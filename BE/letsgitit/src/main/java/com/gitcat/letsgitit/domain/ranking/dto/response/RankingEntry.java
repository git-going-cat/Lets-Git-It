package com.gitcat.letsgitit.domain.ranking.dto.response;

import com.gitcat.letsgitit.domain.single.entity.enums.Grade;

public record RankingEntry(
	int rank,
	String nickname,
	int score,
	Grade grade,
	Integer playTime) {
}
