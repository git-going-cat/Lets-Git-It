package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;

public interface CoopRankingJpaRepository extends JpaRepository<CoopRanking, UUID> {

	// Top3: rank ASC 정렬로 상위 3팀 고정 조회
	List<CoopRanking> findTop3ByWeekOrderByRankAsc(String week);

	// Around: rank BETWEEN minRank AND maxRank (내 팀 순위 ±2 범위)
	List<CoopRanking> findByWeekAndRankBetweenOrderByRankAsc(String week, int minRank, int maxRank);

	// 전체 건수: around 범위 클램핑 및 hasNext 판단에 사용
	long countByWeek(String week);
}
