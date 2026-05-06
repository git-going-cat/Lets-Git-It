package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.entity.SingleRanking;
import com.gitcat.letsgitit.global.enums.Difficulty;

public interface SingleRankingRepository {
	List<SingleRanking> findTop3ByDifficultyAndWeek(Difficulty difficulty, String week);

	Optional<SingleRanking> findByMemberIdAndDifficultyAndWeek(UUID memberId, Difficulty difficulty, String week);

	List<SingleRanking> findAroundByDifficultyAndWeekAndRank(Difficulty difficulty, String week, int minRank,
		int maxRank);

	long countByDifficultyAndWeek(Difficulty difficulty, String week);

	List<SingleRanking> findScrollResult(Difficulty difficulty, String week, int cursor, int size);

	void saveAll(List<SingleRanking> rankings);
}
