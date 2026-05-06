package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.ranking.entity.SingleRanking;
import com.gitcat.letsgitit.global.enums.Difficulty;

public interface SingleRankingJpaRepository extends JpaRepository<SingleRanking, UUID> {
	List<SingleRanking> findTop3ByDifficultyAndWeekOrderByRankAsc(Difficulty difficulty, String week);

	Optional<SingleRanking> findByMemberIdAndDifficultyAndWeek(UUID memberId, Difficulty difficulty, String week);

	List<SingleRanking> findByDifficultyAndWeekAndRankBetweenOrderByRankAsc(Difficulty difficulty, String week,
		int minRank, int maxRank);

	long countByDifficultyAndWeek(Difficulty difficulty, String week);
}
