package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.ranking.entity.CompetitiveRanking;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;

public interface CompetitiveRankingJpaRepository extends JpaRepository<CompetitiveRanking, UUID> {

	// Top3: rank ASC 정렬로 상위 3개 고정 조회
	List<CompetitiveRanking> findTop3ByModeAndWeekOrderByRankAsc(CompetitiveMode mode, String week);

	// 내 랭킹: member + mode + week 복합 unique 조건으로 단건 조회
	Optional<CompetitiveRanking> findByMemberIdAndModeAndWeek(UUID memberId, CompetitiveMode mode, String week);

	// Around: rank BETWEEN minRank AND maxRank (내 순위 ±2 범위)
	List<CompetitiveRanking> findByModeAndWeekAndRankBetweenOrderByRankAsc(CompetitiveMode mode, String week,
		int minRank, int maxRank);

	// 전체 건수: around 범위 클램핑 및 hasNext 판단에 사용
	long countByModeAndWeek(CompetitiveMode mode, String week);
}
