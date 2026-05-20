package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.ranking.entity.CompetitiveRanking;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CompetitiveRankingRepositoryImpl implements CompetitiveRankingRepository {

	private final CompetitiveRankingJpaRepository competitiveRankingJpaRepository;
	private final CompetitiveRankingDslRepository competitiveRankingDslRepository;

	@Override
	public void saveAll(List<CompetitiveRanking> rankings) {
		competitiveRankingJpaRepository.saveAll(rankings);
	}

	@Override
	public List<CompetitiveRanking> findTop3ByModeAndWeek(CompetitiveMode mode, String week) {
		return competitiveRankingJpaRepository.findTop3ByModeAndWeekOrderByRankAsc(mode, week);
	}

	@Override
	public Optional<CompetitiveRanking> findByMemberIdAndModeAndWeek(UUID memberId, CompetitiveMode mode, String week) {
		return competitiveRankingJpaRepository.findByMemberIdAndModeAndWeek(memberId, mode, week);
	}

	@Override
	public List<CompetitiveRanking> findAroundByModeAndWeekAndRank(CompetitiveMode mode, String week, int minRank,
		int maxRank) {
		return competitiveRankingJpaRepository.findByModeAndWeekAndRankBetweenOrderByRankAsc(mode, week, minRank,
			maxRank);
	}

	@Override
	public long countByModeAndWeek(CompetitiveMode mode, String week) {
		return competitiveRankingJpaRepository.countByModeAndWeek(mode, week);
	}

	@Override
	public List<CompetitiveRanking> findScrollResult(CompetitiveMode mode, String week, int afterRank, int size) {
		return competitiveRankingDslRepository.findScrollResult(mode, week, afterRank, size);
	}

	@Override
	public List<CompetitiveRanking> findScrollResultBefore(CompetitiveMode mode, String week, int beforeRank,
		int size) {
		return competitiveRankingDslRepository.findScrollResultBefore(mode, week, beforeRank, size);
	}
}
