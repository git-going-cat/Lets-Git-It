package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;

import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;

public interface CoopRankingRepository {

	long countByWeek(String week);

	void saveAll(List<CoopRanking> rankings);
}
