package com.gitcat.letsgitit.domain.ranking.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingScrollResponse;
import com.gitcat.letsgitit.domain.single.entity.enums.Grade;
import com.gitcat.letsgitit.global.enums.Difficulty;

public interface SingleRankingService {

	SingleRankingInitialResponse getSingleRanking(Difficulty difficulty, int size, UUID memberId);

	SingleRankingScrollResponse getSingleRankingScroll(Difficulty difficulty, int cursor, int size, UUID memberId);

	SingleRankingInitialResponse getSingleRankingHistory(
		Difficulty difficulty,
		int year,
		int month,
		int week,
		int size,
		UUID memberId);

	SingleRankingScrollResponse getSingleRankingHistoryScroll(
		Difficulty difficulty,
		int year,
		int month,
		int week,
		int cursor,
		int size,
		UUID memberId);

	int updateSingleScore(Difficulty difficulty, UUID memberId, int score, Grade grade);
}
