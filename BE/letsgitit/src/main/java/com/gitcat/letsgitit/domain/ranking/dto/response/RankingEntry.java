package com.gitcat.letsgitit.domain.ranking.dto.response;

public record RankingEntry(
	int rank,
	String nickname,
	int score) {
}
