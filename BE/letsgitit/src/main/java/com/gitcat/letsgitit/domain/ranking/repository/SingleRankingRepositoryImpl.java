package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.ranking.entity.SingleRanking;
import com.gitcat.letsgitit.global.enums.Difficulty;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class SingleRankingRepositoryImpl implements SingleRankingRepository {

	private final SingleRankingJpaRepository singleRankingJpaRepository;
	private final SingleRankingDslRepository singleRankingDslRepository;

	@Override
	public List<SingleRanking> findTop3ByDifficultyAndWeek(Difficulty difficulty, String week) {
		return singleRankingJpaRepository.findTop3ByDifficultyAndWeekOrderByRankAsc(difficulty, week);
	}

	@Override
	public Optional<SingleRanking> findByMemberIdAndDifficultyAndWeek(UUID memberId, Difficulty difficulty,
		String week) {
		return singleRankingJpaRepository.findByMemberIdAndDifficultyAndWeek(memberId, difficulty, week);
	}

	@Override
	public List<SingleRanking> findAroundByDifficultyAndWeekAndRank(Difficulty difficulty, String week, int minRank,
		int maxRank) {
		return singleRankingJpaRepository.findByDifficultyAndWeekAndRankBetweenOrderByRankAsc(difficulty, week, minRank,
			maxRank);
	}

	@Override
	public long countByDifficultyAndWeek(Difficulty difficulty, String week) {
		return singleRankingJpaRepository.countByDifficultyAndWeek(difficulty, week);
	}

	@Override
	public List<SingleRanking> findScrollResult(Difficulty difficulty, String week, int cursor, int size) {
		return singleRankingDslRepository.findScrollResult(difficulty, week, cursor, size);
	}

	@Override
	public void saveAll(List<SingleRanking> rankings) {
		singleRankingJpaRepository.saveAll(rankings);
	}
}
