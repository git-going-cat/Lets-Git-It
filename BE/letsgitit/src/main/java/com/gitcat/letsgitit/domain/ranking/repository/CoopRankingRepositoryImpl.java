package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CoopRankingRepositoryImpl implements CoopRankingRepository {

	private final CoopRankingJpaRepository coopRankingJpaRepository;
	private final CoopRankingDslRepository coopRankingDslRepository;

	@Override
	public List<CoopRanking> findTop3ByWeek(String week) {
		return coopRankingJpaRepository.findTop3ByWeekOrderByRankAsc(week);
	}

	@Override
	public Optional<CoopRanking> findMyCoopRankingByMemberIdAndWeek(UUID memberId, String week) {
		return coopRankingDslRepository.findMyCoopRankingByMemberIdAndWeek(memberId, week);
	}

	@Override
	public List<CoopRanking> findAroundByWeekAndRank(String week, int minRank, int maxRank) {
		return coopRankingJpaRepository.findByWeekAndRankBetweenOrderByRankAsc(week, minRank, maxRank);
	}

	@Override
	public long countByWeek(String week) {
		return coopRankingJpaRepository.countByWeek(week);
	}

	@Override
	public List<CoopRanking> findScrollResult(String week, int afterRank, int size) {
		return coopRankingDslRepository.findScrollResult(week, afterRank, size);
	}

	@Override
	public List<CoopRanking> findScrollResultBefore(String week, int beforeRank, int size) {
		return coopRankingDslRepository.findScrollResultBefore(week, beforeRank, size);
	}

	@Override
	public void saveAll(List<CoopRanking> rankings) {
		coopRankingJpaRepository.saveAll(rankings);
	}
}
