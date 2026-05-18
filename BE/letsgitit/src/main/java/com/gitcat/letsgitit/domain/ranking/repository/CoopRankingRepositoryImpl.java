package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CoopRankingRepositoryImpl implements CoopRankingRepository {

	private final CoopRankingJpaRepository coopRankingJpaRepository;

	@Override
	public long countByWeek(String week) {
		return coopRankingJpaRepository.countByWeek(week);
	}

	@Override
	public void saveAll(List<CoopRanking> rankings) {
		coopRankingJpaRepository.saveAll(rankings);
	}
}
