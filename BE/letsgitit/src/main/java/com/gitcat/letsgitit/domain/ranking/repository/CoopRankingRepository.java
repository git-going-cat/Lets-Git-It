package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;

public interface CoopRankingRepository {

	// Top3: 초기 진입 고정 노출용
	List<CoopRanking> findTop3ByWeek(String week);

	// 내 팀 랭킹: coop_result_member 조인으로 로그인 사용자가 속한 팀 중 가장 높은 순위 조회
	Optional<CoopRanking> findMyCoopRankingByMemberIdAndWeek(UUID memberId, String week);

	// Around: 내 팀 순위 ±2 범위 조회
	List<CoopRanking> findAroundByWeekAndRank(String week, int minRank, int maxRank);

	// 전체 건수: hasNext 판단 및 around 범위 클램핑에 사용
	long countByWeek(String week);

	// 아래 방향 스크롤: afterRank 초과 데이터를 rank ASC로 size+1개 조회
	List<CoopRanking> findScrollResult(String week, int afterRank, int size);

	// 위 방향 스크롤: beforeRank 미만 데이터를 rank DESC로 size+1개 조회 (역순 후 뒤집기)
	List<CoopRanking> findScrollResultBefore(String week, int beforeRank, int size);

	void saveAll(List<CoopRanking> rankings);
}
