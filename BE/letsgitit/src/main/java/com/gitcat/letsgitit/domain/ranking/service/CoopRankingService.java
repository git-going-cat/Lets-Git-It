package com.gitcat.letsgitit.domain.ranking.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.CoopRankingScrollResponse;

public interface CoopRankingService {
	// ** 이번주 **
	/**
	 * 초기 조회 (top3 + myRank + around ±2 고정)
	 */
	CoopRankingInitialResponse getCoopRanking(UUID memberId);

	/**
	 * 아래 방향 스크롤 (afterRank 다음부터)
	 */
	CoopRankingScrollResponse getCoopRankingScrollAfter(int afterRank, int size, UUID memberId);

	/**
	 * 위 방향 스크롤 (beforeRank 이전까지)
	 */
	CoopRankingScrollResponse getCoopRankingScrollBefore(int beforeRank, int size, UUID memberId);

	/**
	 * 협력 랭킹 등록 (게임 종료 시 호출)
	 */
	void registerCoopRanking(CoopRankingData data);

	// ** 과거주 **
	// 초기 진입: top3 고정 + myRank(내가 속한 팀의 최고 순위) + around(±2) 반환
	CoopRankingInitialResponse getCoopRankingHistory(int year, int month, int week, int size, UUID memberId);

	// 아래 방향 스크롤: afterRank 초과 데이터 조회
	CoopRankingScrollResponse getCoopRankingHistoryScrollAfter(int year, int month, int week, int afterRank, int size,
		UUID memberId);

	// 위 방향 스크롤: beforeRank 미만 데이터 조회
	CoopRankingScrollResponse getCoopRankingHistoryScrollBefore(int year, int month, int week, int beforeRank, int size,
		UUID memberId);
}
