package com.gitcat.letsgitit.domain.ranking.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingScrollResponse;
import com.gitcat.letsgitit.domain.single.entity.enums.Grade;
import com.gitcat.letsgitit.global.enums.Difficulty;

public interface SingleRankingService {

	SingleRankingInitialResponse getSingleRanking(Difficulty difficulty, int size, UUID memberId);

	SingleRankingScrollResponse getSingleRankingScrollAfter(Difficulty difficulty, int afterRank, int size,
		UUID memberId);

	SingleRankingScrollResponse getSingleRankingScrollBefore(Difficulty difficulty, int beforeRank, int size,
		UUID memberId);

	Integer getCurrentWeekScore(Difficulty difficulty, UUID memberId);

	SingleRankingInitialResponse getSingleRankingHistory(
		Difficulty difficulty,
		int year,
		int month,
		int week,
		int size,
		UUID memberId);

	SingleRankingScrollResponse getSingleRankingHistoryScrollAfter(
		Difficulty difficulty,
		int year,
		int month,
		int week,
		int afterRank,
		int size,
		UUID memberId);

	SingleRankingScrollResponse getSingleRankingHistoryScrollBefore(
		Difficulty difficulty,
		int year,
		int month,
		int week,
		int beforeRank,
		int size,
		UUID memberId);

	int updateSingleScore(Difficulty difficulty, UUID memberId, int score, Grade grade);
}
