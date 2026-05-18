package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.entity.CompetitiveRanking;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;

public interface CompetitiveRankingRepository {

	// 저장
	void saveAll(List<CompetitiveRanking> rankings);

	// Top3: 초기 진입 고정 노출용
	List<CompetitiveRanking> findTop3ByModeAndWeek(CompetitiveMode mode, String week);

	// 내 랭킹: 로그인 사용자 순위 조회 (없으면 empty)
	Optional<CompetitiveRanking> findByMemberIdAndModeAndWeek(UUID memberId, CompetitiveMode mode, String week);

	// Around: 내 순위 ±2 범위 조회
	List<CompetitiveRanking> findAroundByModeAndWeekAndRank(CompetitiveMode mode, String week, int minRank,
		int maxRank);

	// 전체 건수: hasNext 판단 및 around 범위 클램핑에 사용
	long countByModeAndWeek(CompetitiveMode mode, String week);

	// 아래 방향 스크롤: afterRank 초과 데이터를 rank ASC로 size+1개 조회
	List<CompetitiveRanking> findScrollResult(CompetitiveMode mode, String week, int afterRank, int size);

	// 위 방향 스크롤: beforeRank 미만 데이터를 rank DESC로 size+1개 조회 (역순 후 뒤집기)
	List<CompetitiveRanking> findScrollResultBefore(CompetitiveMode mode, String week, int beforeRank, int size);
}
